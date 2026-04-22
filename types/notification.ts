export type NotificationType = "MENTION" | "NEW_REVIEW" | "PR_MERGED" | "COMMENT_REPLY" | "REVIEW_FAILED"
export type NotificationReviewStatus = "PENDING" | "COMPLETED" | "FAILED"

/** 소켓/DB에서 사용되는 기본 알림 타입 */
export interface BaseNotification {
  id: string
  type: NotificationType
  reviewStatus: NotificationReviewStatus | null
  title: string
  message: string | null
  isRead: boolean
  userId: string
  prId: string | null
  commentId: string | null
  createdAt: string
  prTitle?: string | null
  prNumber?: number | null
  repoFullName?: string | null
}

/** API 응답에서 사용되는 확장 알림 타입 (PR 상세 정보 포함) */
export interface Notification extends BaseNotification {
  prTitle: string | null
  prNumber: number | null
  repoFullName: string | null
}

export interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
  total: number
}

export interface NotificationSetting {
  mentionEnabled: boolean
  newReviewEnabled: boolean
  prMergedEnabled: boolean
  commentReplyEnabled: boolean
}

export type NotificationFilterType = NotificationType | "ALL"
export type NotificationFilterRead = "all" | "unread" | "read"
