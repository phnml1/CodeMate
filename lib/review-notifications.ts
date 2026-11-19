import { prisma } from "@/lib/prisma";
import { notificationCompatSelect } from "@/lib/notifications/compat";
import type { NotificationReviewStatus } from "@/types/notification";

function getReviewNotificationContent(
  status: NotificationReviewStatus,
  prTitle: string
) {
  switch (status) {
    case "PENDING":
      return {
        title: "AI 리뷰 진행 중",
        message: `"${prTitle}"의 변경 사항을 분석하고 있습니다.`,
      };
    case "FAILED":
      return {
        title: "AI 리뷰 실패",
        message: `"${prTitle}"의 AI 리뷰를 완료하지 못했습니다.`,
      };
    case "COMPLETED":
    default:
      return {
        title: "AI 리뷰 완료",
        message: `"${prTitle}"의 리뷰 결과가 준비됐습니다.`,
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

      if (existing) {
        await prisma.notification.update({
          where: { id: existing.id },
          data: {
            title: content.title,
            message: content.message,
            reviewStatus: params.status,
            isRead: false,
            readAt: null,
            createdAt: new Date(),
          },
          select: notificationCompatSelect,
        });
        return;
      }

      await prisma.notification.create({
        data: {
          type: "NEW_REVIEW",
          title: content.title,
          message: content.message,
          reviewStatus: params.status,
          isRead: false,
          userId,
          prId: params.prId,
        },
        select: notificationCompatSelect,
      });
    })
  );
}
