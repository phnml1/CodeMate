import type { Server, Socket } from "socket.io"
import type { CommentWithAuthor, Reactions } from "../../types/comment"
import type { BaseNotification } from "../../types/notification"
import type { CollaborationMessage } from "../../types/collaboration"

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
  "collaboration:message": (message: CollaborationMessage) => void
  "collaboration:location": (location: CollaborationLocation) => void
  "collaboration:location:clear": (data: { roomId: string; userId: string }) => void
  "collaboration:typing": (typing: CollaborationTypingEvent) => void
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
  "collaboration:location": (
    data: CollaborationLocationInput,
    ack: (response: CollaborationLocationAck) => void
  ) => void
  "collaboration:location:stop": (
    data: { roomId: string },
    ack: (response: CollaborationLocationAck) => void
  ) => void
  "collaboration:typing": (
    data: CollaborationTypingInput,
    ack: (response: CollaborationLocationAck) => void
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

export interface CollaborationCodeSelection {
  side: "LEFT" | "RIGHT"
  startLine: number
  endLine: number
}

export interface CollaborationTextSelection extends CollaborationCodeSelection {
  startOffset: number
  endOffset: number
}

export interface CollaborationViewport {
  top: number
  left: number
  lineOffset?: number
}

export interface CollaborationLocationInput {
  roomId: string
  filePath: string
  baseSha: string
  headSha: string
  side: "LEFT" | "RIGHT"
  line: number | null
  selection: CollaborationCodeSelection | null
  textSelection?: CollaborationTextSelection | null
  viewport?: CollaborationViewport
}

export interface CollaborationLocation extends CollaborationLocationInput {
  userId: string
  updatedAt: string
}

export interface CollaborationTypingAnchor {
  filePath: string
  side: "LEFT" | "RIGHT"
  startLine: number
  baseSha: string
  headSha: string
}

export interface CollaborationTypingInput {
  roomId: string
  anchor: CollaborationTypingAnchor | null
  isTyping: boolean
}

export interface CollaborationTypingEvent extends CollaborationTypingInput {
  userId: string
  userName: string
}

export type CollaborationAckErrorCode =
  | "INVALID_TOKEN"
  | "FORBIDDEN"
  | "ROOM_FULL"
  | "NOT_JOINED"
  | "INVALID_LOCATION"

export type CollaborationJoinAck =
  | {
      ok: true
      roomId: string
      heartbeatIntervalMs: number
      reconnectGraceMs: number
      presence: CollaborationPresenceSnapshot
      locations: CollaborationLocation[]
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

export type CollaborationLocationAck =
  | { ok: true; roomId: string }
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

type InternalSocketEventName = Exclude<
  ServerToClientEventName,
  "collaboration:location" | "collaboration:location:clear"
  | "collaboration:typing"
>

export type InternalSocketEmitPayload = {
  [Event in InternalSocketEventName]: {
    room: string
    event: Event
    data: ServerToClientPayload<Event>
  }
}[InternalSocketEventName]
