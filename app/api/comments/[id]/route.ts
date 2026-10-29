import { auth } from "@/lib/auth"
import { collaborationMessageInclude, serializeCollaborationMessage, updateCollaborationMessageSchema } from "@/lib/collaboration/rooms"
import { prisma } from "@/lib/prisma"
import { emitCollaborationMessageDeleted, emitCollaborationMessageUpdated } from "@/lib/socket/emitter"
import { NextResponse } from "next/server"

/**
 * @swagger
 * /api/comments/{id}:
 *   patch:
 *     summary: 리뷰 수정
 *     description: 본인 리뷰 내용을 수정합니다.
 *     tags:
 *       - Comment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 리뷰 수정 성공
 *       401:
 *         description: 인증되지 않은 사용자
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 리뷰를 찾을 수 없음
 *       500:
 *         description: 서버 내부 오류
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const comment = await prisma.comment.findUnique({ where: { id } })
    if (!comment) {
      return NextResponse.json({ error: "리뷰를 찾을 수 없습니다." }, { status: 404 })
    }
    if (comment.authorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (comment.githubStatus === "PUBLISHED" || comment.githubStatus === "PUBLISHING") {
      return NextResponse.json({ error: "GitHub에 전송한 리뷰는 여기서 수정할 수 없습니다." }, { status: 409 })
    }

    const body = await request.json()
    const { content } = body as { content: string }
    if (!content?.trim()) {
      return NextResponse.json({ error: "리뷰 내용을 입력해주세요." }, { status: 400 })
    }
    if (comment.collaborationMessageId && !updateCollaborationMessageSchema.safeParse({ content }).success) {
      return NextResponse.json({ error: "리뷰 내용은 4000자 이하여야 합니다." }, { status: 400 })
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: {
        content: content.trim(),
        ...(comment.collaborationMessageId
          ? { collaborationMessage: { update: { content: content.trim() } } }
          : {}),
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
        collaborationMessage: { include: collaborationMessageInclude },
      },
    })

    if (updated.collaborationMessage) {
      try {
        await emitCollaborationMessageUpdated(serializeCollaborationMessage(updated.collaborationMessage))
      } catch (error) {
        console.error("[comments] Collaboration review update broadcast failed:", error)
      }
    }

    return NextResponse.json({ comment: updated })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     summary: 리뷰 삭제
 *     description: 본인 리뷰를 삭제합니다. 답글도 cascade 삭제됩니다.
 *     tags:
 *       - Comment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 리뷰 삭제 성공
 *       401:
 *         description: 인증되지 않은 사용자
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 리뷰를 찾을 수 없음
 *       500:
 *         description: 서버 내부 오류
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const comment = await prisma.comment.findUnique({ where: { id } })
    if (!comment) {
      return NextResponse.json({ error: "리뷰를 찾을 수 없습니다." }, { status: 404 })
    }
    if (comment.authorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (comment.githubStatus === "PUBLISHED" || comment.githubStatus === "PUBLISHING") {
      return NextResponse.json({ error: "GitHub에 전송한 리뷰는 여기서 삭제할 수 없습니다." }, { status: 409 })
    }

    if (comment.collaborationMessageId) {
      const deleted = await prisma.collaborationMessage.delete({
        where: { id: comment.collaborationMessageId },
        select: { id: true, roomId: true },
      })
      try {
        await emitCollaborationMessageDeleted(deleted.roomId, deleted.id)
      } catch (error) {
        console.error("[comments] Collaboration review delete broadcast failed:", error)
      }
    } else {
      await prisma.comment.delete({ where: { id } })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
