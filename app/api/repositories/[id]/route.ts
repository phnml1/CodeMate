import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

/**
 * @swagger
 * /api/repositories/{id}:
 *   delete:
 *     summary: Repository 연동 해제
 *     description: CodeMate에 연동된 Repository를 해제합니다.
 *     tags:
 *       - Repository
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Repository DB ID
 *     responses:
 *       200:
 *         description: Repository 연동 해제 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       401:
 *         description: 인증되지 않은 사용자
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: 권한 없음 (소유자가 아님)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Repository를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 내부 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const repository = await prisma.repository.findUnique({
      where: { id },
    })

    if (!repository) {
      return NextResponse.json(
        { error: "Repository를 찾을 수 없습니다" },
        { status: 404 }
      )
    }

    if (repository.userId !== session.user.id) {
      return NextResponse.json(
        { error: "해당 Repository에 대한 권한이 없습니다" },
        { status: 403 }
      )
    }

    await prisma.repository.delete({ where: { id } })

    return NextResponse.json({
      message: "Repository 연동이 해제되었습니다",
    })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
