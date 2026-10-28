import { Octokit } from "@octokit/rest";
import { Prisma } from "@/lib/generated/prisma/client";
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/ai/claude";
import { parseAIReviewResponse } from "@/lib/ai/parsers";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompts";
import { prisma } from "@/lib/prisma";
import { getRepositoryGithubUsers } from "@/lib/repository-access";
import { calculateScore } from "@/lib/scoring";
import type { ReviewStage } from "@/types/review";

export type AnalyzeReviewResult =
  | { status: "COMPLETED" }
  | { status: "FAILED" }
  | { status: "SKIPPED_ACTIVE" };

function isGithubAuthenticationError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 401
  );
}

function getReviewFailureReason(error: unknown): string {
  if (isGithubAuthenticationError(error)) {
    return "GitHub 인증이 만료되었습니다. GitHub 계정을 다시 연결해 주세요.";
  }

  if (error instanceof Error) {
    return error.message.slice(0, 1000);
  }

  return "AI 리뷰 처리 중 알 수 없는 오류가 발생했습니다.";
}

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
  pullRequestId: string,
  preferredUserId?: string
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

    const tokenUsers = await getRepositoryGithubUsers(
      pr.repo.id,
      preferredUserId
    );
    if (tokenUsers.length === 0) {
      throw new Error("GitHub token not found for any connected repository user");
    }

    const [owner, repo] = pr.repo.fullName.split("/");
    let files: Array<{ filename: string; patch?: string | null }> | null = null;
    let authorName: string | null = null;
    let lastAuthenticationError: unknown = null;

    for (const tokenUser of tokenUsers) {
      try {
        const octokit = new Octokit({ auth: tokenUser.githubToken });
        const response = await octokit.rest.pulls.listFiles({
          owner,
          repo,
          pull_number: pr.number,
          per_page: 100,
        });
        files = response.data;
        authorName = tokenUser.name;
        break;
      } catch (error) {
        if (!isGithubAuthenticationError(error)) throw error;
        lastAuthenticationError = error;
        console.warn(
          `[analyzeReview] GitHub token rejected for repository user ${tokenUser.id}; trying the next connected user.`
        );
      }
    }

    if (!files) {
      throw lastAuthenticationError ?? new Error(
        "No valid GitHub token found for any connected repository user"
      );
    }

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
          failureReason: getReviewFailureReason(error),
        },
      });
    }

    return { status: "FAILED" };
  }
}
