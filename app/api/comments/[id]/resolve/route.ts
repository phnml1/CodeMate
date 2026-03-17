import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

/**
 * @swagger
 * /api/comments/{id}/resolve:
 *   patch:
 *     summary: 댓글 resolve 토글
 *     description: 댓글의 resolve 상태를 반전합니다.
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
 *         description: resolve 토글 성공
 *       401:
 *         description: 인증되지 않은 사용자
 *       404:
 *         description: 댓글을 찾을 수 없음
 *       500:
 *         description: 서버 내부 오류
 */
export async function PATCH(
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
      return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 })
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: { isResolved: !comment.isResolved },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    })

    return NextResponse.json({ comment: updated })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
