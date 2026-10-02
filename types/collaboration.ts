import type {
  CollaborationPresenceSnapshot,
  CollaborationPresenceUser,
} from "@/lib/socket/types"

export type CollaborationRoomStatus = "ACTIVE" | "ENDED"
export type CollaborationRoomMemberRole = "OWNER" | "MEMBER"

export interface CollaborationRoomMember {
  id: string
  role: CollaborationRoomMemberRole
  userId: string
  user: {
    id: string
    name: string | null
    image: string | null
  }
  joinedAt: string
  leftAt: string | null
}

export interface CollaborationRoom {
  id: string
  name: string
  status: CollaborationRoomStatus
  capacity: number
  pullRequestId: string
  ownerId: string
  owner: {
    id: string
    name: string | null
    image: string | null
  }
  pullRequest: {
    id: string
    number: number
    title: string
    repoId: string
    repo: {
      id: string
      name: string
      fullName: string
    }
  }
  members: CollaborationRoomMember[]
  memberCount: number
  occupiedCount?: number
  messageCount: number
  endedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CollaborationRoomsResponse {
  rooms: CollaborationRoom[]
}

export interface CollaborationRoomResponse {
  room: CollaborationRoom
}

export interface CollaborationSocketTokenResponse {
  token: string
  roomId: string
  expiresAt: string
  ttlSeconds: number
  heartbeatIntervalMs: number
  reconnectGraceMs: number
}

export interface CollaborationMessage {
  id: string
  roomId: string
  authorId: string
  author: {
    id: string
    name: string | null
    image: string | null
  }
  content: string
  clientMessageId: string | null
  codeReference: CollaborationCodeReference | null
  createdAt: string
  updatedAt: string
  deliveryStatus?: "sending" | "failed"
}

export interface CollaborationCodeReference {
  filePath: string
  side: "LEFT" | "RIGHT"
  startLine: number
  endLine: number
  baseSha?: string | null
  headSha?: string | null
}

export interface CollaborationCodeAnchor {
  filePath: string
  side: "LEFT" | "RIGHT"
  startLine: number
  endLine: number
  baseSha: string
  headSha: string
}

export interface CollaborationCodeThreadSummary {
  side: "LEFT" | "RIGHT"
  startLine: number
  count: number
}

export interface CollaborationCodeThreadSummaryResponse {
  threads: CollaborationCodeThreadSummary[]
}

export interface CollaborationMessagesResponse {
  messages: CollaborationMessage[]
  nextCursor: string | null
}

export interface CollaborationMessageResponse {
  message: CollaborationMessage
}

export type { CollaborationPresenceSnapshot, CollaborationPresenceUser }
