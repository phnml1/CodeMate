import { NextResponse } from "next/server";
import { analyzeReview } from "@/lib/ai/analyze";
import { getEnabledUserIds } from "@/lib/notification-settings";
import { prisma } from "@/lib/prisma";
import { getRepositoryMemberIds } from "@/lib/repository-access";
import { upsertReviewNotifications } from "@/lib/review-notifications";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pullRequestId } = body as { pullRequestId?: string };

    if (!pullRequestId) {
      return NextResponse.json(
        { error: "pullRequestId is required" },
        { status: 400 }
      );
    }

    const pr = await prisma.pullRequest.findUnique({
      where: { id: pullRequestId },
      select: {
        id: true,
        title: true,
        number: true,
        repoId: true,
      },
    });

    if (!pr) {
      return NextResponse.json(
        { error: "Pull request not found" },
        { status: 404 }
      );
    }

    const repositoryUserIds = [...new Set(await getRepositoryMemberIds(pr.repoId))];
    const pendingRecipientIds = await getEnabledUserIds(
      repositoryUserIds,
      "NEW_REVIEW"
    );

    await upsertReviewNotifications({
      userIds: pendingRecipientIds,
      prId: pullRequestId,
      prTitle: pr.title,
      prNumber: pr.number,
      status: "PENDING",
    });

    analyzeReview(pullRequestId)
      .then(async (result) => {
        if (result.status === "SKIPPED_ACTIVE") {
          return;
        }

        const targetRecipients =
          result.status === "FAILED"
            ? await getEnabledUserIds(repositoryUserIds, "REVIEW_FAILED")
            : pendingRecipientIds;

        await upsertReviewNotifications({
          userIds: targetRecipients,
          prId: pullRequestId,
          prTitle: pr.title,
          prNumber: pr.number,
          status: result.status,
        });
      })
      .catch((error) => console.error("[analyze] analyzeReview failed:", error));

    return NextResponse.json({ status: "PENDING" });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
