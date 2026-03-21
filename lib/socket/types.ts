import type { Server, Socket } from "socket.io"
import type { Socket as ClientSocket } from "socket.io-client"
import type { CommentWithAuthor } from "@/types/comment"
import type { BaseNotification } from "@/types/notification"

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

export type TypedClientSocket = ClientSocket<
  ServerToClientEvents,
  ClientToServerEvents
>
