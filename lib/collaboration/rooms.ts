import type { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { buildAccessiblePullRequestWhere } from "@/lib/repository-access"
import { getCollaborationPresence } from "@/lib/socket/presence"
import { getCollaborationPresenceScope } from "@/lib/collaboration/presence-scope"
import { z } from "zod"

export const COLLABORATION_ROOM_DEFAULT_CAPACITY = 8
export const COLLABORATION_ROOM_MAX_CAPACITY = 20
export const COLLABORATION_MESSAGE_MAX_LENGTH = 4000

const codeReferenceSchema = z
  .object({
    filePath: z.string().trim().min(1).max(500),
    side: z.enum(["LEFT", "RIGHT"]).default("RIGHT"),
    startLine: z.number().int().positive(),
    endLine: z.number().int().positive(),
    startColumn: z.number().int().positive().optional(),
    endColumn: z.number().int().positive().optional(),
    baseSha: z.string().trim().max(100).optional(),
    headSha: z.string().trim().max(100).optional(),
    selectedText: z.string().max(12000).optional(),
  })
  .refine((value) => value.endLine >= value.startLine, {
    message: "endLine must be greater than or equal to startLine",
    path: ["endLine"],
  })

export const createCollaborationRoomSchema = z.object({
  pullRequestId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120).optional(),
  capacity: z
    .number()
    .int()
    .min(2)
    .max(COLLABORATION_ROOM_MAX_CAPACITY)
    .optional(),
})

export const updateCollaborationRoomSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  capacity: z
    .number()
    .int()
    .min(2)
    .max(COLLABORATION_ROOM_MAX_CAPACITY)
    .optional(),
  status: z.enum(["ACTIVE", "ENDED"]).optional(),
})

export const createCollaborationMessageSchema = z.object({
  content: z.string().trim().min(1).max(COLLABORATION_MESSAGE_MAX_LENGTH),
  clientMessageId: z.string().trim().min(1).max(120).optional(),
  codeReference: codeReferenceSchema.optional(),
})

export type CreateCollaborationRoomInput = z.infer<
  typeof createCollaborationRoomSchema
>
export type UpdateCollaborationRoomInput = z.infer<
  typeof updateCollaborationRoomSchema
>
export type CreateCollaborationMessageInput = z.infer<
  typeof createCollaborationMessageSchema
>

export const collaborationRoomInclude = {
  owner: { select: { id: true, name: true, image: true } },
  pullRequest: {
    select: {
      id: true,
      number: true,
      title: true,
      repoId: true,
      repo: { select: { id: true, name: true, fullName: true } },
    },
  },
  members: {
    where: { leftAt: null },
    orderBy: { joinedAt: "asc" },
    include: { user: { select: { id: true, name: true, image: true } } },
  },
  _count: { select: { messages: true } },
} satisfies Prisma.CollaborationRoomInclude

export const collaborationMessageInclude = {
  author: { select: { id: true, name: true, image: true } },
  codeReference: true,
} satisfies Prisma.CollaborationMessageInclude

type CollaborationRoomWithRelations = Prisma.CollaborationRoomGetPayload<{
  include: typeof collaborationRoomInclude
}>

type CollaborationMessageWithRelations = Prisma.CollaborationMessageGetPayload<{
  include: typeof collaborationMessageInclude
}>

export function serializeCollaborationRoom(room: CollaborationRoomWithRelations) {
  return {
    id: room.id,
    name: room.name,
    status: room.status,
    capacity: room.capacity,
    pullRequestId: room.pullRequestId,
    ownerId: room.ownerId,
    owner: room.owner,
    pullRequest: room.pullRequest,
    members: room.members.map((member) => ({
      id: member.id,
      role: member.role,
      userId: member.userId,
      user: member.user,
      joinedAt: member.joinedAt.toISOString(),
      leftAt: member.leftAt?.toISOString() ?? null,
    })),
    memberCount: room.members.length,
    messageCount: room._count.messages,
    endedAt: room.endedAt?.toISOString() ?? null,
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  }
}

export function serializeCollaborationMessage(
  message: CollaborationMessageWithRelations
) {
  return {
    id: message.id,
    roomId: message.roomId,
    authorId: message.authorId,
    author: message.author,
    content: message.content,
    clientMessageId: message.clientMessageId,
    codeReference: message.codeReference,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
  }
}

export async function findAccessiblePullRequest(
  userId: string,
  pullRequestId: string
) {
  const accessibleWhere = await buildAccessiblePullRequestWhere(userId)

  return prisma.pullRequest.findFirst({
    where: {
      id: pullRequestId,
      ...accessibleWhere,
    },
    select: {
      id: true,
      number: true,
      title: true,
      repoId: true,
      repo: { select: { id: true, name: true, fullName: true } },
    },
  })
}

export async function findAccessibleCollaborationRoom(
  userId: string,
  roomId: string
) {
  const accessiblePullRequestWhere = await buildAccessiblePullRequestWhere(userId)

  return prisma.collaborationRoom.findFirst({
    where: {
      id: roomId,
      presenceScope: getCollaborationPresenceScope(),
      pullRequest: accessiblePullRequestWhere,
    },
    include: collaborationRoomInclude,
  })
}

export async function ensureCollaborationRoomMember(
  tx: Prisma.TransactionClient,
  roomId: string,
  userId: string,
  role: "OWNER" | "MEMBER" = "MEMBER"
) {
  return tx.collaborationRoomMember.upsert({
    where: {
      roomId_userId: {
        roomId,
        userId,
      },
    },
    create: {
      roomId,
      userId,
      role,
    },
    update: {
      ...(role === "OWNER" ? { role } : {}),
      leftAt: null,
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  })
}

export async function getActiveMemberCount(roomId: string) {
  const { rooms } = await getCollaborationPresence([roomId])
  return rooms[0].users.length
}

export function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  )
}
