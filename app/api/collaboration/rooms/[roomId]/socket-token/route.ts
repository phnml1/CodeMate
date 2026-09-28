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
import { NextResponse } from "next/server"

type RouteContext = {
  params: Promise<{ roomId: string }>
}

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { roomId } = await params
    const room = await findAccessibleCollaborationRoom(session.user.id, roomId)

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    if (room.status === "ENDED") {
      return NextResponse.json({ error: "Room has ended" }, { status: 409 })
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

    if (!existingMember || existingMember.leftAt) {
      const memberCount = await getActiveMemberCount(room.id)
      if (memberCount >= room.capacity) {
        return NextResponse.json({ error: "Room is full" }, { status: 409 })
      }
    }

    const member = await prisma.$transaction(async (tx) => {
      return ensureCollaborationRoomMember(
        tx,
        room.id,
        session.user.id
      )
    })

    const userName =
      member.user.name ?? session.user.name ?? session.user.email ?? "Unknown user"
    const { token, payload } = createCollaborationRoomSocketToken({
      roomId: room.id,
      memberId: member.id,
      userId: session.user.id,
      userName,
      capacity: room.capacity,
    })

    return NextResponse.json({
      token,
      roomId: room.id,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      ttlSeconds: COLLABORATION_SOCKET_TOKEN_TTL_SECONDS,
      heartbeatIntervalMs: COLLABORATION_HEARTBEAT_INTERVAL_MS,
      reconnectGraceMs: COLLABORATION_RECONNECT_GRACE_MS,
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
