import { prisma } from "@/lib/prisma";
import { emitNotification } from "@/lib/socket/emitter";
import type { NotificationReviewStatus } from "@/types/notification";

function getReviewNotificationContent(
  status: NotificationReviewStatus,
  prTitle: string
) {
  switch (status) {
    case "PENDING":
      return {
        title: "AI review in progress",
        message: `Waiting for the AI review of "${prTitle}".`,
      };
    case "FAILED":
      return {
        title: "AI review failed",
        message: `The AI review for "${prTitle}" could not be completed.`,
      };
    case "COMPLETED":
    default:
      return {
        title: "AI review is ready",
        message: `The AI review for "${prTitle}" is complete.`,
      };
  }
}

export async function upsertReviewNotifications(params: {
  userIds: string[];
  prId: string;
  prTitle: string;
  prNumber: number;
  status: NotificationReviewStatus;
}) {
  if (params.userIds.length === 0) {
    return;
  }

  const content = getReviewNotificationContent(params.status, params.prTitle);

  await Promise.all(
    params.userIds.map(async (userId) => {
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          prId: params.prId,
          type: "NEW_REVIEW",
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      const notification = existing
        ? await prisma.notification.update({
            where: { id: existing.id },
            data: {
              title: content.title,
              message: content.message,
              isRead: false,
              reviewStatus: params.status,
              createdAt: new Date(),
            },
          })
        : await prisma.notification.create({
            data: {
              type: "NEW_REVIEW",
              reviewStatus: params.status,
              title: content.title,
              message: content.message,
              isRead: false,
              userId,
              prId: params.prId,
            },
          });

      emitNotification(userId, {
        ...notification,
        createdAt: notification.createdAt.toISOString(),
        prTitle: params.prTitle,
        prNumber: params.prNumber,
      });
    })
  );
}
