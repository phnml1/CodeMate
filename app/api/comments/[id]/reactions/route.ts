import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { emitCommentReactionUpdated } from "@/lib/socket/emitter"
import { NextResponse } from "next/server"
import type { ReactionEmoji, Reactions } from "@/types/comment"

const VALID_EMOJIS: ReactionEmoji[] = ["👍", "❤️", "🎉", "🚀", "👀"]

/**
 * @swagger
 * /api/comments/{id}/reactions:
 *   post:
 *     summary: 이모지 반응 토글
 *     description: 이모지 반응을 추가하거나 취소합니다.
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
 *         description: 반응 토글 성공
 *       400:
 *         description: 유효하지 않은 이모지
 *       401:
 *         description: 인증되지 않은 사용자
 *       404:
 *         description: 댓글을 찾을 수 없음
 *       500:
 *         description: 서버 내부 오류
 */
export async function POST(
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
      return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 })
    }

    const body = await request.json()
    const { emoji } = body as { emoji: ReactionEmoji }

    if (!VALID_EMOJIS.includes(emoji)) {
      return NextResponse.json({ error: "유효하지 않은 이모지입니다." }, { status: 400 })
    }

    const reactions: Reactions = (comment.reactions as Reactions) ?? {}
    const currentUsers = reactions[emoji] ?? []
    const userId = session.user.id

    const updatedUsers = currentUsers.includes(userId)
      ? currentUsers.filter((uid) => uid !== userId)
      : [...currentUsers, userId]

    const updatedReactions: Reactions = {
      ...reactions,
      [emoji]: updatedUsers,
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: { reactions: updatedReactions },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    })

    emitCommentReactionUpdated(comment.pullRequestId, id, updatedReactions)

    return NextResponse.json({ comment: updated })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
