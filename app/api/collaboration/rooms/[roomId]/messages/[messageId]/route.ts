import { auth } from "@/lib/auth"
import {
  collaborationMessageInclude,
  findAccessibleCollaborationRoom,
  serializeCollaborationMessage,
  updateCollaborationMessageSchema,
} from "@/lib/collaboration/rooms"
import { prisma } from "@/lib/prisma"
import {
  emitCollaborationMessageDeleted,
  emitCollaborationMessageUpdated,
} from "@/lib/socket/emitter"
import { NextResponse } from "next/server"

type RouteContext = {
  params: Promise<{ roomId: string; messageId: string }>
}

function isRecordNotFound(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2025"
}

async function findOwnedMessage(roomId: string, messageId: string, userId: string) {
  const room = await findAccessibleCollaborationRoom(userId, roomId)
  if (!room) return { error: NextResponse.json({ error: "Room not found" }, { status: 404 }) }
  if (room.status !== "ACTIVE") return { error: NextResponse.json({ error: "Room has ended" }, { status: 409 }) }

  const message = await prisma.collaborationMessage.findFirst({
    where: { id: messageId, roomId: room.id },
    select: { id: true, authorId: true, reviewComment: { select: { id: true, githubStatus: true } } },
  })
  if (!message) return { error: NextResponse.json({ error: "Message not found" }, { status: 404 }) }
  if (message.authorId !== userId) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  return { roomId: room.id, reviewCommentId: message.reviewComment?.id, githubStatus: message.reviewComment?.githubStatus }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { roomId, messageId } = await params
    const access = await findOwnedMessage(roomId, messageId, session.user.id)
    if (access.error) return access.error
    if (access.githubStatus === "PUBLISHED" || access.githubStatus === "PUBLISHING") {
      return NextResponse.json({ error: "GitHub에 전송한 리뷰는 여기서 수정할 수 없습니다." }, { status: 409 })
    }

    const parsed = updateCollaborationMessageSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten() }, { status: 400 })

    const message = await prisma.collaborationMessage.update({
      where: { id: messageId, roomId, authorId: session.user.id },
      data: {
        content: parsed.data.content,
        ...(access.reviewCommentId ? { reviewComment: { update: { content: parsed.data.content } } } : {}),
      },
      include: collaborationMessageInclude,
    })
    const serialized = serializeCollaborationMessage(message)
    try {
      await emitCollaborationMessageUpdated(serialized)
    } catch (error) {
      console.error("[collaboration messages] Update broadcast failed:", error)
    }
    return NextResponse.json({ message: serialized })
  } catch (error) {
    if (isRecordNotFound(error)) return NextResponse.json({ error: "Message not found" }, { status: 404 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { roomId, messageId } = await params
    const access = await findOwnedMessage(roomId, messageId, session.user.id)
    if (access.error) return access.error
    if (access.githubStatus === "PUBLISHED" || access.githubStatus === "PUBLISHING") {
      return NextResponse.json({ error: "GitHub에 전송한 리뷰는 여기서 삭제할 수 없습니다." }, { status: 409 })
    }

    await prisma.collaborationMessage.delete({
      where: { id: messageId, roomId, authorId: session.user.id },
    })
    try {
      await emitCollaborationMessageDeleted(roomId, messageId)
    } catch (error) {
      console.error("[collaboration messages] Delete broadcast failed:", error)
    }
    return new Response(null, { status: 204 })
  } catch (error) {
    if (isRecordNotFound(error)) return NextResponse.json({ error: "Message not found" }, { status: 404 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
