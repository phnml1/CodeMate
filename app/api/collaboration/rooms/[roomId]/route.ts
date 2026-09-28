import { auth } from "@/lib/auth"
import {
  collaborationRoomInclude,
  findAccessibleCollaborationRoom,
  serializeCollaborationRoom,
  updateCollaborationRoomSchema,
} from "@/lib/collaboration/rooms"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

type RouteContext = {
  params: Promise<{ roomId: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
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

    return NextResponse.json({ room: serializeCollaborationRoom(room) })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
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

    if (room.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const json = await request.json().catch(() => null)
    const parsed = updateCollaborationRoomSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updatedRoom = await prisma.collaborationRoom.update({
      where: { id: room.id },
      data: {
        ...(parsed.data.name ? { name: parsed.data.name } : {}),
        ...(parsed.data.capacity ? { capacity: parsed.data.capacity } : {}),
        ...(parsed.data.status
          ? {
              status: parsed.data.status,
              endedAt:
                parsed.data.status === "ENDED"
                  ? room.endedAt ?? new Date()
                  : null,
            }
          : {}),
      },
      include: collaborationRoomInclude,
    })

    return NextResponse.json({ room: serializeCollaborationRoom(updatedRoom) })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
