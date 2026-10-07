import { auth } from "@/lib/auth"
import {
  ensureCollaborationRoomMember,
  findAccessibleCollaborationRoom,
  getActiveMemberCount,
} from "@/lib/collaboration/rooms"
import {
  COLLABORATION_HEARTBEAT_INTERVAL_MS,
  COLLABORATION_RECONNECT_GRACE_MS,
  COLLABORATION_SOCKET_TOKEN_TTL_SECONDS,
  createCollaborationRoomSocketToken,
} from "@/lib/collaboration/socket-token"
import { prisma } from "@/lib/prisma"
import { createCollaborationServerTimer } from "@/lib/collaboration/server-performance"
import { CollaborationPresenceUnavailableError } from "@/lib/socket/presence"
import { NextResponse } from "next/server"

type RouteContext = {
  params: Promise<{ roomId: string }>
}

export async function POST(_request: Request, { params }: RouteContext) {
  const timer = createCollaborationServerTimer("collaboration.token.issue")
  let roomId: string | undefined
  const respond = (body: Record<string, unknown>, status: number) => {
    const serverTiming = timer.finish(String(status), roomId)
    const response = NextResponse.json(body, { status })
    if (serverTiming) response.headers.set("Server-Timing", serverTiming)
    return response
  }
  try {
    const session = await auth()
    timer.checkpoint("auth")
    if (!session?.user?.id) {
      return respond({ error: "Unauthorized" }, 401)
    }

    const resolvedParams = await params
    roomId = resolvedParams.roomId
    timer.checkpoint("params")
    const room = await findAccessibleCollaborationRoom(session.user.id, resolvedParams.roomId)
    timer.checkpoint("roomLookup")

    if (!room) {
      return respond({ error: "Room not found" }, 404)
    }

    if (room.status === "ENDED") {
      return respond({ error: "Room has ended" }, 409)
    }

    const existingMember = await prisma.collaborationRoomMember.findUnique({
      where: {
        roomId_userId: {
          roomId: room.id,
          userId: session.user.id,
        },
      },
      select: { id: true, leftAt: true },
    })
    timer.checkpoint("memberLookup")

    const memberCount = await getActiveMemberCount(room.id)
    timer.checkpoint("presence")
    if ((!existingMember || existingMember.leftAt) && memberCount >= room.capacity) {
      return respond({ error: "Room is full" }, 409)
    }

    const member = await prisma.$transaction(async (tx) => {
      return ensureCollaborationRoomMember(
        tx,
        room.id,
        session.user.id
      )
    })
    timer.checkpoint("memberUpsert")

    const userName =
      member.user.name ?? session.user.name ?? session.user.email ?? "Unknown user"
    const { token, payload } = createCollaborationRoomSocketToken({
      roomId: room.id,
      memberId: member.id,
      userId: session.user.id,
      userName,
      capacity: room.capacity,
    })
    timer.checkpoint("sign")

    return respond({
      token,
      roomId: room.id,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      ttlSeconds: COLLABORATION_SOCKET_TOKEN_TTL_SECONDS,
      heartbeatIntervalMs: COLLABORATION_HEARTBEAT_INTERVAL_MS,
      reconnectGraceMs: COLLABORATION_RECONNECT_GRACE_MS,
    }, 200)
  } catch (error) {
    if (error instanceof CollaborationPresenceUnavailableError) {
      return respond({ error: "Collaboration presence unavailable" }, 503)
    }
    return respond({ error: "Internal server error" }, 500)
  }
}
