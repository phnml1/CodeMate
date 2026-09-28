import { auth } from "@/lib/auth"
import {
  collaborationRoomInclude,
  ensureCollaborationRoomMember,
  findAccessibleCollaborationRoom,
  getActiveMemberCount,
  serializeCollaborationRoom,
} from "@/lib/collaboration/rooms"
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

    const updatedRoom = await prisma.$transaction(async (tx) => {
      await ensureCollaborationRoomMember(tx, room.id, session.user.id)

      return tx.collaborationRoom.findUniqueOrThrow({
        where: { id: room.id },
        include: collaborationRoomInclude,
      })
    })

    return NextResponse.json({ room: serializeCollaborationRoom(updatedRoom) })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
