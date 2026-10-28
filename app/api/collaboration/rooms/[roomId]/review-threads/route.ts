import { auth } from "@/lib/auth"
import {
  collaborationMessageInclude,
  findAccessibleCollaborationRoom,
  serializeCollaborationMessage,
} from "@/lib/collaboration/rooms"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
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

    const reviewId = new URL(request.url).searchParams.get("reviewId")?.trim()
    if (!reviewId) {
      return NextResponse.json({ error: "reviewId is required" }, { status: 400 })
    }

    const review = await prisma.review.findFirst({
      where: { id: reviewId, pullRequestId: room.pullRequestId },
      select: { id: true },
    })
    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    const messages = await prisma.collaborationMessage.findMany({
      where: {
        roomId: room.id,
        reviewReference: { is: { reviewId } },
      },
      include: collaborationMessageInclude,
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({
      messages: messages.map(serializeCollaborationMessage),
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
