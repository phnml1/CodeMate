import { NextResponse } from "next/server";
import { analyzeReview } from "@/lib/ai/analyze";
import { getEnabledUserIds } from "@/lib/notification-settings";
import { prisma } from "@/lib/prisma";
import { getRepositoryMemberIds } from "@/lib/repository-access";
import { upsertReviewNotifications } from "@/lib/review-notifications";
import type { NotificationReviewStatus } from "@/types/notification";

async function notifyReviewStatus(params: {
  repositoryId: string;
  prId: string;
  prTitle: string;
  prNumber: number;
  status: NotificationReviewStatus;
}) {
  try {
    const repositoryUserIds = [
      ...new Set(await getRepositoryMemberIds(params.repositoryId)),
    ];
    const notificationType =
      params.status === "FAILED" ? "REVIEW_FAILED" : "NEW_REVIEW";
    const userIds = await getEnabledUserIds(repositoryUserIds, notificationType);

    await upsertReviewNotifications({
      userIds,
      prId: params.prId,
      prTitle: params.prTitle,
      prNumber: params.prNumber,
      status: params.status,
    });
  } catch (error) {
    console.error("[review notification] failed:", error);
  }
}

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

    void notifyReviewStatus({
      repositoryId: pr.repoId,
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

        await notifyReviewStatus({
          repositoryId: pr.repoId,
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
