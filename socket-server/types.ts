import type { Server, Socket } from "socket.io"

// --- Comment types (inline from @/types/comment) ---
export type ReactionEmoji = "👍" | "❤️" | "🎉" | "🚀" | "👀"
export type Reactions = Partial<Record<ReactionEmoji, string[]>>

export interface CommentAuthor {
  id: string
  name: string | null
  image: string | null
}

export interface Comment {
  id: string
  content: string
  lineNumber: number | null
  filePath: string | null
  isResolved: boolean
  pullRequestId: string
  authorId: string
  parentId: string | null
  mentions: string[]
  reactions: Reactions
  createdAt: string
  updatedAt: string
}

export interface CommentWithAuthor extends Comment {
  author: CommentAuthor
  replies: CommentWithAuthor[]
}

// --- Notification types (inline from @/types/notification) ---
export type NotificationType = "MENTION" | "NEW_REVIEW" | "PR_MERGED" | "COMMENT_REPLY"

export interface BaseNotification {
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

// --- Socket event types ---
export interface ServerToClientEvents {
  "comment:new": (comment: CommentWithAuthor) => void
  "comment:updated": (comment: CommentWithAuthor) => void
  "comment:deleted": (data: { commentId: string; prId: string }) => void
  "typing:start": (data: { userId: string; userName: string }) => void
  "typing:stop": (data: { userId: string }) => void
  "inline:typing:start": (data: { userId: string; userName: string; filePath: string; lineNumber: number }) => void
  "inline:typing:stop": (data: { userId: string }) => void
  "notification:new": (notification: BaseNotification) => void
}

export interface ClientToServerEvents {
  "room:join": (prId: string) => void
  "room:leave": (prId: string) => void
  "typing:start": (prId: string) => void
  "typing:stop": (prId: string) => void
  "inline:typing:start": (data: { prId: string; filePath: string; lineNumber: number }) => void
  "inline:typing:stop": (prId: string) => void
}

export type InterServerEvents = Record<string, never>

export interface SocketData {
  userId: string
  userName: string
}

export type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

export type TypedServerSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

