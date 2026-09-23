import { after, NextResponse } from "next/server";
import { analyzeReview } from "@/lib/ai/analyze";
import { auth } from "@/lib/auth";
import { invalidateDashboardForUsers } from "@/lib/dashboard-cache";
import { getEnabledUserIds } from "@/lib/notification-settings";
import { prisma } from "@/lib/prisma";
import {
  buildAccessiblePullRequestWhere,
  getRepositoryMemberIds,
} from "@/lib/repository-access";
import { upsertReviewNotifications } from "@/lib/review-notifications";
import type { NotificationReviewStatus } from "@/types/notification";

export const maxDuration = 300;

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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
      | { pullRequestId?: unknown }
      | null;
    const pullRequestId = body?.pullRequestId;

    if (typeof pullRequestId !== "string" || !pullRequestId.trim()) {
      return NextResponse.json(
        { error: "pullRequestId is required" },
        { status: 400 }
      );
    }

    const accessibleWhere = await buildAccessiblePullRequestWhere(session.user.id);
    const pr = await prisma.pullRequest.findFirst({
      where: { id: pullRequestId, ...accessibleWhere },
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

    after(async () => {
      try {
        await notifyReviewStatus({
          repositoryId: pr.repoId,
          prId: pr.id,
          prTitle: pr.title,
          prNumber: pr.number,
          status: "PENDING",
        });

        const result = await analyzeReview(pr.id);
        if (result.status === "SKIPPED_ACTIVE") {
          return;
        }

        invalidateDashboardForUsers(await getRepositoryMemberIds(pr.repoId));

        await notifyReviewStatus({
          repositoryId: pr.repoId,
          prId: pr.id,
          prTitle: pr.title,
          prNumber: pr.number,
          status: result.status,
        });
      } catch (error) {
        console.error("[analyze] analyzeReview failed:", error);
      }
    });

    return NextResponse.json({ status: "PENDING" });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
