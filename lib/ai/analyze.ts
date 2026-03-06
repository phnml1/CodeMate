import { Octokit } from "@octokit/rest"
import { prisma } from "@/lib/prisma"
import { anthropic, CLAUDE_MODEL } from "@/lib/ai/claude"
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompts"
import { parseAIReviewResponse } from "@/lib/ai/parsers"
import { calculateScore } from "@/lib/scoring"

export async function analyzeReview(pullRequestId: string): Promise<void> {
  let reviewId: string | null = null

  try {
    // Find or create a Review record
    const existing = await prisma.review.findFirst({
      where: { pullRequestId, status: { in: ["PENDING", "IN_PROGRESS"] } },
      orderBy: { reviewedAt: "desc" },
    })

    if (existing) {
      reviewId = existing.id
    } else {
      const created = await prisma.review.create({
        data: {
          pullRequestId,
          status: "PENDING",
          aiSuggestions: {},
          qualityScore: 0,
          severity: "LOW",
          issueCount: 0,
        },
      })
      reviewId = created.id
    }

    await prisma.review.update({
      where: { id: reviewId },
      data: { status: "IN_PROGRESS" },
    })

    // Load PR + Repository + owner's GitHub token
    const pr = await prisma.pullRequest.findUnique({
      where: { id: pullRequestId },
      include: {
        repo: {
          include: {
            owner: { select: { githubToken: true, name: true } },
          },
        },
      },
    })

    if (!pr) throw new Error(`PullRequest not found: ${pullRequestId}`)

    const { githubToken, name: authorName } = pr.repo.owner
    if (!githubToken) throw new Error("GitHub token not found for repository owner")

    // Fetch PR diff from GitHub
    const octokit = new Octokit({ auth: githubToken })
    const [owner, repo] = pr.repo.fullName.split("/")

    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pr.number,
      per_page: 100,
    })

    const diff = files
      .filter((f) => f.patch)
      .map((f) => `--- ${f.filename}\n${f.patch}`)
      .join("\n\n")

    // Call Claude
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
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
      },
    })
  } catch (err) {
    console.error("[analyzeReview] failed:", err)

    if (reviewId) {
      await prisma.review.update({
        where: { id: reviewId },
        data: { status: "FAILED" },
      })
    }
  }
}
