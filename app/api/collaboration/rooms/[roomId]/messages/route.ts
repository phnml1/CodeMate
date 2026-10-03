import { auth } from "@/lib/auth"
import {
  collaborationMessageInclude,
  createCollaborationMessageSchema,
  findAccessibleCollaborationRoom,
  isUniqueConstraintError,
  serializeCollaborationMessage,
} from "@/lib/collaboration/rooms"
import { prisma } from "@/lib/prisma"
import { emitCollaborationMessage } from "@/lib/socket/emitter"
import { NextResponse } from "next/server"

type RouteContext = {
  params: Promise<{ roomId: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
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

    const { searchParams } = new URL(request.url)
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10))
    )
    const cursor = searchParams.get("cursor") ?? undefined

    const messages = await prisma.collaborationMessage.findMany({
      where: { roomId: room.id },
      include: collaborationMessageInclude,
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    return NextResponse.json({
      messages: messages.slice().reverse().map(serializeCollaborationMessage),
      nextCursor:
        messages.length === limit
          ? messages[messages.length - 1]?.id ?? null
          : null,
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: RouteContext) {
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

    const member = await prisma.collaborationRoomMember.findUnique({
      where: {
        roomId_userId: {
          roomId: room.id,
          userId: session.user.id,
        },
      },
      select: { id: true, leftAt: true },
    })

    if (!member || member.leftAt) {
      return NextResponse.json(
        { error: "Join room before sending messages" },
        { status: 403 }
      )
    }

    const json = await request.json().catch(() => null)
    const parsed = createCollaborationMessageSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    try {
      const message = await prisma.collaborationMessage.create({
        data: {
          roomId: room.id,
          authorId: session.user.id,
          content: parsed.data.content,
          clientMessageId: parsed.data.clientMessageId,
          ...(parsed.data.codeReference
            ? {
                codeReference: {
                  create: parsed.data.codeReference,
                },
              }
            : {}),
        },
        include: collaborationMessageInclude,
      })

      const serializedMessage = serializeCollaborationMessage(message)
      try {
        await emitCollaborationMessage(serializedMessage)
      } catch (error) {
        console.error("[collaboration messages] Socket broadcast failed:", error)
      }

      return NextResponse.json({ message: serializedMessage }, { status: 201 })
    } catch (error) {
      if (parsed.data.clientMessageId && isUniqueConstraintError(error)) {
        const existingMessage = await prisma.collaborationMessage.findUnique({
          where: {
            roomId_authorId_clientMessageId: {
              roomId: room.id,
              authorId: session.user.id,
              clientMessageId: parsed.data.clientMessageId,
            },
          },
          include: collaborationMessageInclude,
        })

        if (existingMessage) {
          return NextResponse.json({
            message: serializeCollaborationMessage(existingMessage),
          })
        }
      }

      throw error
    }
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
