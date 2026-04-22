import { Octokit } from "@octokit/rest"
import { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/ai/claude"
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompts"
import { parseAIReviewResponse } from "@/lib/ai/parsers"
import { getRepositoryPrimaryUser } from "@/lib/repository-access"
import { calculateScore } from "@/lib/scoring"

function isActiveReviewConflict(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    Array.isArray(err.meta?.target) &&
    (err.meta.target as string[]).some(
      (target) => target === "review_active_unique" || target === "pullRequestId"
    )
  )
}

function getResetReviewData() {
  return {
    status: "PENDING" as const,
    aiSuggestions: {},
    qualityScore: 0,
    severity: "LOW" as const,
    issueCount: 0,
    failureReason: null,
    reviewedAt: new Date(),
  }
}

function getFailureReason(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  return "AI review could not be completed."
}

export type AnalyzeReviewResult =
  | {
      status: "COMPLETED"
      reviewId: string
    }
  | {
      status: "FAILED"
      reviewId: string | null
      failureReason: string
    }
  | {
      status: "SKIPPED_ACTIVE"
      reviewId: null
    }

export async function analyzeReview(
  pullRequestId: string
): Promise<AnalyzeReviewResult> {
  let reviewId: string | null = null

  try {
    const activeReview = await prisma.review.findFirst({
      where: {
        pullRequestId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      select: { id: true },
      orderBy: { reviewedAt: "desc" },
    })

    if (activeReview) {
      console.info(
        `[analyzeReview] already active for PR ${pullRequestId}, skipping.`
      )
      return {
        status: "SKIPPED_ACTIVE",
        reviewId: null,
      }
    }

    let review: { id: string }
    try {
      review = await prisma.review.create({
        data: {
          pullRequestId,
          ...getResetReviewData(),
        },
        select: { id: true },
      })
    } catch (error) {
      if (isActiveReviewConflict(error)) {
        const existingReview = await prisma.review.findFirst({
          where: { pullRequestId },
          select: { id: true, status: true },
          orderBy: { reviewedAt: "desc" },
        })

        if (
          existingReview &&
          (existingReview.status === "PENDING" ||
            existingReview.status === "IN_PROGRESS")
        ) {
          console.info(
            `[analyzeReview] already active for PR ${pullRequestId}, skipping.`
          )
          return {
            status: "SKIPPED_ACTIVE",
            reviewId: null,
          }
        }

        if (existingReview) {
          await prisma.review.update({
            where: { id: existingReview.id },
            data: getResetReviewData(),
            select: { id: true },
          })

          review = { id: existingReview.id }
        } else {
          throw error
        }
      } else {
        throw error
      }
    }

    reviewId = review.id

    await prisma.review.update({
      where: { id: reviewId },
      data: {
        status: "IN_PROGRESS",
        failureReason: null,
      },
    })

    const pr = await prisma.pullRequest.findUnique({
      where: { id: pullRequestId },
      include: {
        repo: true,
      },
    })

    if (!pr) {
      throw new Error(`Pull request not found: ${pullRequestId}`)
    }

    const tokenUser = await getRepositoryPrimaryUser(pr.repo.id, {
      requireGithubToken: true,
    })
    const githubToken = tokenUser?.githubToken ?? null
    const authorName = tokenUser?.name ?? null

    if (!githubToken) {
      throw new Error("GitHub token not found for any connected repository user")
    }

    const octokit = new Octokit({ auth: githubToken })
    const [owner, repo] = pr.repo.fullName.split("/")

    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pr.number,
      per_page: 100,
    })

    const MAX_DIFF_CHARS = 20000
    let diff = ""
    for (const file of files.filter((candidate) => candidate.patch)) {
      const chunk = `--- ${file.filename}\n${file.patch}\n\n`
      if (diff.length + chunk.length > MAX_DIFF_CHARS) {
        diff += "... (diff truncated)"
        break
      }
      diff += chunk
    }

    const response = await getAnthropicClient().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserPrompt(
            {
              title: pr.title,
              description: pr.description,
              baseBranch: pr.baseBranch,
              headBranch: pr.headBranch,
              author: authorName ?? owner,
            },
            diff
          ),
        },
      ],
    })

    const text =
      response.content[0].type === "text" ? response.content[0].text : ""
    const parsed = parseAIReviewResponse(text)
    const { score, overallSeverity, issueCount } = calculateScore(parsed.issues)

    await prisma.review.update({
      where: { id: reviewId },
      data: {
        aiSuggestions: parsed,
        qualityScore: score,
        severity: overallSeverity,
        issueCount,
        status: "COMPLETED",
        failureReason: null,
      },
    })

    return {
      status: "COMPLETED",
      reviewId,
    }
  } catch (error) {
    const failureReason = getFailureReason(error)
    console.error("[analyzeReview] failed:", error)

    if (reviewId) {
      await prisma.review.update({
        where: { id: reviewId },
        data: {
          status: "FAILED",
          failureReason,
        },
      })
    }

    return {
      status: "FAILED",
      reviewId,
      failureReason,
    }
  }
}
