import type { Server, Socket } from "socket.io"
import type { Socket as ClientSocket } from "socket.io-client"
import type { CommentWithAuthor } from "@/types/comment"

export interface NotificationPayload {
  id: string
  userId: string
  type: "mention" | "reply" | "review"
  prId: string
  message: string
  createdAt: string
  isRead: boolean
}

export interface ServerToClientEvents {
  "comment:new": (comment: CommentWithAuthor) => void
  "comment:updated": (comment: CommentWithAuthor) => void
  "comment:deleted": (data: { commentId: string; prId: string }) => void
  "typing:start": (data: { userId: string; userName: string }) => void
  "typing:stop": (data: { userId: string }) => void
  "notification:new": (notification: NotificationPayload) => void
}

export interface ClientToServerEvents {
  "room:join": (prId: string) => void
  "room:leave": (prId: string) => void
  "typing:start": (prId: string) => void
  "typing:stop": (prId: string) => void
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

export type TypedClientSocket = ClientSocket<
  ServerToClientEvents,
  ClientToServerEvents
>
