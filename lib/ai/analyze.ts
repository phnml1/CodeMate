import { Octokit } from "@octokit/rest"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/ai/claude"
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompts"
import { parseAIReviewResponse } from "@/lib/ai/parsers"
import { calculateScore } from "@/lib/scoring"

/**
 * DB partial unique index("review_active_unique") 위반 여부를 판별한다.
 *
 * 이 오류는 동일 PR에 대해 PENDING/IN_PROGRESS Review가 이미 존재할 때 발생하며,
 * "다른 인스턴스가 이미 처리 중"이라는 정상적인 중복 차단 신호다.
 * → 오류로 취급하지 않고 조용히 종료(early return)한다.
 */
function isActiveReviewConflict(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    Array.isArray(err.meta?.target) &&
    (err.meta.target as string[]).includes("review_active_unique")
  )
}

export async function analyzeReview(pullRequestId: string): Promise<void> {
  let reviewId: string | null = null

  try {
    // ── Review 레코드 생성 ──────────────────────────────────────────────────
    // findFirst → create 패턴(TOCTOU race condition)을 제거하고,
    // create를 먼저 시도한다.
    //
    // DB partial unique index가 PENDING/IN_PROGRESS 중복을 원자적으로 차단하므로
    // 동시 요청이 와도 정확히 하나의 인스턴스만 create에 성공한다.
    let review: { id: string }
    try {
      review = await prisma.review.create({
        data: {
          pullRequestId,
          status: "PENDING",
          aiSuggestions: {},
          qualityScore: 0,
          severity: "LOW",
          issueCount: 0,
        },
        select: { id: true },
      })
    } catch (err) {
      if (isActiveReviewConflict(err)) {
        // 이미 다른 인스턴스가 처리 중 — 정상적인 중복 차단
        console.info(
          `[analyzeReview] already active for PR ${pullRequestId}, skipping.`
        )
        return
      }
      throw err
    }
    reviewId = review.id

    await prisma.review.update({
      where: { id: reviewId },
      data: { status: "IN_PROGRESS" },
    })

    // ── PR + Repository + GitHub 토큰 로드 ─────────────────────────────────
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

    // ── GitHub에서 PR diff 조회 ─────────────────────────────────────────────
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
    for (const f of files.filter((f) => f.patch)) {
      const chunk = `--- ${f.filename}\n${f.patch}\n\n`
      if (diff.length + chunk.length > MAX_DIFF_CHARS) {
        diff += "... (diff truncated)"
        break
      }
      diff += chunk
    }

    // ── Claude 호출 ─────────────────────────────────────────────────────────
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
