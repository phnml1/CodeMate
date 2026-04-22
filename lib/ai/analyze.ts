import { Octokit } from "@octokit/rest";
import { Prisma } from "@/lib/generated/prisma/client";
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/ai/claude";
import { parseAIReviewResponse } from "@/lib/ai/parsers";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompts";
import { prisma } from "@/lib/prisma";
import { getRepositoryPrimaryUser } from "@/lib/repository-access";
import { calculateScore } from "@/lib/scoring";
import type { ReviewStage } from "@/types/review";

export type AnalyzeReviewResult =
  | { status: "COMPLETED" }
  | { status: "FAILED" }
  | { status: "SKIPPED_ACTIVE" };

function isActiveReviewConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    Array.isArray(error.meta?.target) &&
    (error.meta.target as string[]).some(
      (target) => target === "review_active_unique" || target === "pullRequestId"
    )
  );
}

async function updateReviewStage(
  reviewId: string,
  params: {
    status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
    stage: ReviewStage;
  }
) {
  await prisma.review.update({
    where: { id: reviewId },
    data: {
      stage: params.stage,
      ...(params.status ? { status: params.status } : {}),
    },
  });
}

export async function analyzeReview(
  pullRequestId: string
): Promise<AnalyzeReviewResult> {
  let reviewId: string | null = null;

  try {
    const activeReview = await prisma.review.findFirst({
      where: {
        pullRequestId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      select: { id: true },
      orderBy: { reviewedAt: "desc" },
    });

    if (activeReview) {
      console.info(`[analyzeReview] already active for PR ${pullRequestId}, skipping.`);
      return { status: "SKIPPED_ACTIVE" };
    }

    let review: { id: string };

    try {
      review = await prisma.review.create({
        data: {
          pullRequestId,
          status: "PENDING",
          stage: "QUEUED",
          aiSuggestions: {},
          qualityScore: 0,
          severity: "LOW",
          issueCount: 0,
        },
        select: { id: true },
      });
    } catch (error) {
      if (isActiveReviewConflict(error)) {
        console.info(`[analyzeReview] already active for PR ${pullRequestId}, skipping.`);
        return { status: "SKIPPED_ACTIVE" };
      }

      throw error;
    }

    reviewId = review.id;

    await updateReviewStage(reviewId, {
      status: "IN_PROGRESS",
      stage: "FETCHING_FILES",
    });

    const pr = await prisma.pullRequest.findUnique({
      where: { id: pullRequestId },
      include: { repo: true },
    });

    if (!pr) {
      throw new Error(`Pull request not found: ${pullRequestId}`);
    }

    const tokenUser = await getRepositoryPrimaryUser(pr.repo.id, {
      requireGithubToken: true,
    });
    const githubToken = tokenUser?.githubToken ?? null;
    const authorName = tokenUser?.name ?? null;

    if (!githubToken) {
      throw new Error("GitHub token not found for any connected repository user");
    }

    const [owner, repo] = pr.repo.fullName.split("/");
    const octokit = new Octokit({ auth: githubToken });
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pr.number,
      per_page: 100,
    });

    const maxDiffChars = 20000;
    let diff = "";

    for (const file of files.filter((candidate) => candidate.patch)) {
      const chunk = `--- ${file.filename}\n${file.patch}\n\n`;
      if (diff.length + chunk.length > maxDiffChars) {
        diff += "... (diff truncated)";
        break;
      }
      diff += chunk;
    }

    await updateReviewStage(reviewId, {
      status: "IN_PROGRESS",
      stage: "ANALYZING",
    });

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
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = parseAIReviewResponse(text);
    const { score, overallSeverity, issueCount } = calculateScore(parsed.issues);

    await updateReviewStage(reviewId, {
      status: "IN_PROGRESS",
      stage: "FINALIZING",
    });

    await prisma.review.update({
      where: { id: reviewId },
      data: {
        aiSuggestions: parsed,
        qualityScore: score,
        severity: overallSeverity,
        issueCount,
        status: "COMPLETED",
        stage: "COMPLETED",
      },
    });

    return { status: "COMPLETED" };
  } catch (error) {
    console.error("[analyzeReview] failed:", error);

    if (reviewId) {
      await prisma.review.update({
        where: { id: reviewId },
        data: {
          status: "FAILED",
          stage: "FAILED",
        },
      });
    }

    return { status: "FAILED" };
  }
}
