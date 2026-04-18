import type { Notification } from "@/types/notification"

/**
 * 알림 타입에 따라 이동할 URL을 반환합니다.
 * - PR 관련 알림 → /pulls/{prId}
 * - 댓글 알림 → /pulls/{prId}#comment-{commentId}
 */
export function getNotificationLink(notification: Notification): string | null {
  if (!notification.prId) return null

  const base = `/pulls/${notification.prId}`

  switch (notification.type) {
    case "MENTION":
    case "COMMENT_REPLY":
      return notification.commentId
        ? `${base}#comment-${notification.commentId}`
        : base
    case "NEW_REVIEW":
      return `${base}?review=open`
    case "PR_MERGED":
      return base
    default:
      return base
  }
}
