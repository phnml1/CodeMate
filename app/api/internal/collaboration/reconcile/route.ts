import { timingSafeEqual } from "crypto"
import { prisma } from "@/lib/prisma"
import { getCollaborationPresence, CollaborationPresenceUnavailableError } from "@/lib/socket/presence"
import { COLLABORATION_PRESENCE_CONVERGENCE_MS } from "@/lib/collaboration/socket-token"
import { NextResponse } from "next/server"
import { getCollaborationPresenceScope } from "@/lib/collaboration/presence-scope"

const BATCH_SIZE = 50

function authorized(request: Request) {
  const secret = process.env.SOCKET_INTERNAL_SECRET
  const supplied = request.headers.get("x-socket-secret")
  const expected = Buffer.from(secret ?? "")
  const actual = Buffer.from(supplied ?? "")
  return Boolean(secret && supplied && expected.length === actual.length && timingSafeEqual(expected, actual))
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - COLLABORATION_PRESENCE_CONVERGENCE_MS)
  let cursor: string | undefined
  let reconciled = 0

  try {
    const presenceScope = getCollaborationPresenceScope()
    if (request.headers.get("x-collaboration-scope") !== presenceScope) {
      return NextResponse.json({ error: "Collaboration scope mismatch" }, { status: 409 })
    }
    do {
      const members = await prisma.collaborationRoomMember.findMany({
        where: { leftAt: null, updatedAt: { lte: cutoff }, room: { status: "ACTIVE", presenceScope } },
        select: { id: true, roomId: true, userId: true, updatedAt: true },
        orderBy: { id: "asc" },
        take: BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      })
      if (members.length === 0) break

      const roomIds = [...new Set(members.map((member) => member.roomId))]
      const { rooms } = await getCollaborationPresence(roomIds)
      const presenceByRoom = new Map(rooms.map((room) => [room.roomId, room]))
      for (const member of members) {
        if (presenceByRoom.get(member.roomId)?.users.some((user) => user.userId === member.userId)) continue
        const result = await prisma.collaborationRoomMember.updateMany({
          where: {
            id: member.id,
            roomId: member.roomId,
            userId: member.userId,
            leftAt: null,
            updatedAt: member.updatedAt,
            room: { presenceScope },
          },
          data: { leftAt: new Date() },
        })
        reconciled += result.count
      }
      cursor = members[members.length - 1].id
      if (members.length < BATCH_SIZE) break
    } while (true)

    return NextResponse.json({ reconciled })
  } catch (error) {
    if (error instanceof CollaborationPresenceUnavailableError) {
      return NextResponse.json({ error: "Collaboration presence unavailable" }, { status: 503 })
    }
    console.error("Collaboration membership reconciliation failed", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
