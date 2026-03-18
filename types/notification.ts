export type NotificationType = "MENTION" | "NEW_REVIEW" | "PR_MERGED" | "COMMENT_REPLY"

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string | null
  isRead: boolean
  userId: string
  prId: string | null
  commentId: string | null
  createdAt: string
}

export interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
}
