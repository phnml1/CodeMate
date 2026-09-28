import type { Server, Socket } from "socket.io"
import type { CommentWithAuthor, Reactions } from "../../types/comment"
import type { BaseNotification } from "../../types/notification"

export interface ServerToClientEvents {
  "comment:new": (comment: CommentWithAuthor) => void
  "comment:updated": (comment: CommentWithAuthor) => void
  "comment:deleted": (data: { commentId: string; prId: string }) => void
  "comment:reaction-updated": (data: {
    commentId: string
    prId: string
    reactions: Reactions
  }) => void
  "typing:start": (data: { userId: string; userName: string }) => void
  "typing:stop": (data: { userId: string }) => void
  "inline:typing:start": (data: { userId: string; userName: string; filePath: string; lineNumber: number }) => void
  "inline:typing:stop": (data: { userId: string }) => void
  "notification:new": (notification: BaseNotification) => void
  "collaboration:presence": (presence: CollaborationPresenceSnapshot) => void
}

export interface ClientToServerEvents {
  "room:join": (prId: string) => void
  "room:leave": (prId: string) => void
  "typing:start": (prId: string) => void
  "typing:stop": (prId: string) => void
  "inline:typing:start": (data: { prId: string; filePath: string; lineNumber: number }) => void
  "inline:typing:stop": (prId: string) => void
  "collaboration:join": (
    data: { token: string },
    ack: (response: CollaborationJoinAck) => void
  ) => void
  "collaboration:leave": (
    data: { roomId: string },
    ack?: (response: CollaborationLeaveAck) => void
  ) => void
  "collaboration:heartbeat": (
    data: { roomId: string },
    ack: (response: CollaborationHeartbeatAck) => void
  ) => void
}

export type InterServerEvents = Record<string, never>

export interface SocketData {
  userId: string
  userName: string
}

export type CollaborationPresenceStatus = "online" | "reconnecting"

export interface CollaborationPresenceUser {
  userId: string
  userName: string
  memberId: string
  status: CollaborationPresenceStatus
  lastSeenAt: string
  socketCount: number
}

export interface CollaborationPresenceSnapshot {
  roomId: string
  generatedAt: string
  users: CollaborationPresenceUser[]
}

export type CollaborationAckErrorCode =
  | "INVALID_TOKEN"
  | "FORBIDDEN"
  | "ROOM_FULL"
  | "NOT_JOINED"

export type CollaborationJoinAck =
  | {
      ok: true
      roomId: string
      heartbeatIntervalMs: number
      reconnectGraceMs: number
      presence: CollaborationPresenceSnapshot
    }
  | {
      ok: false
      error: {
        code: CollaborationAckErrorCode
        message: string
      }
    }

export type CollaborationLeaveAck =
  | { ok: true; roomId: string }
  | {
      ok: false
      error: {
        code: CollaborationAckErrorCode
        message: string
      }
    }

export type CollaborationHeartbeatAck =
  | { ok: true; roomId: string; serverTime: string }
  | {
      ok: false
      error: {
        code: CollaborationAckErrorCode
        message: string
      }
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

export type ServerToClientEventName = keyof ServerToClientEvents

export type ServerToClientPayload<Event extends ServerToClientEventName> =
  Parameters<ServerToClientEvents[Event]>[0]

export type InternalSocketEmitPayload = {
  [Event in ServerToClientEventName]: {
    room: string
    event: Event
    data: ServerToClientPayload<Event>
  }
}[ServerToClientEventName]
