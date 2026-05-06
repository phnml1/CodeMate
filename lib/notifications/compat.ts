import type {
  BaseNotification,
  NotificationReviewStatus,
} from "@/types/notification"

export const notificationCompatSelect = {
  id: true,
  type: true,
  title: true,
  message: true,
  isRead: true,
  userId: true,
  prId: true,
  commentId: true,
  createdAt: true,
} as const

type NotificationCompatRecord = Omit<BaseNotification, "createdAt" | "reviewStatus"> & {
  createdAt: Date
}

function inferReviewStatus(
  notification: Pick<NotificationCompatRecord, "type" | "title">
): NotificationReviewStatus | null {
  if (notification.type === "REVIEW_FAILED") return "FAILED"
  if (notification.type !== "NEW_REVIEW") return null

  const title = notification.title.toLowerCase()

  if (title.includes("progress") || title.includes("pending")) return "PENDING"
  if (title.includes("failed")) return "FAILED"
  return "COMPLETED"
}

export function toBaseNotification(
  notification: NotificationCompatRecord,
  reviewStatus?: NotificationReviewStatus | null
): BaseNotification {
  return {
    ...notification,
    reviewStatus: reviewStatus ?? inferReviewStatus(notification),
    createdAt: notification.createdAt.toISOString(),
  }
}
