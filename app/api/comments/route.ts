import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

/**
 * @swagger
 * /api/comments:
 *   get:
 *     summary: 전체 댓글 목록 조회
 *     description: 현재 사용자 소유 저장소의 댓글 목록을 필터/페이지네이션과 함께 반환합니다.
 *     tags:
 *       - Comment
 *     parameters:
 *       - in: query
 *         name: repoId
 *         schema:
 *           type: string
 *         description: 저장소 ID 필터
 *       - in: query
 *         name: prId
 *         schema:
 *           type: string
 *         description: PR ID 필터
 *       - in: query
 *         name: authorId
 *         schema:
 *           type: string
 *         description: 작성자 ID 필터
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 댓글 목록 조회 성공
 *       401:
 *         description: 인증되지 않은 사용자
 *       500:
 *         description: 서버 내부 오류
 */
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const repoId = searchParams.get("repoId") ?? undefined
    const prId = searchParams.get("prId") ?? undefined
    const authorId = searchParams.get("authorId") ?? undefined
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)))

    const where = {
      parentId: null,
      pullRequest: {
        repo: { userId: session.user.id },
        ...(repoId && { repoId }),
      },
      ...(prId && { pullRequestId: prId }),
      ...(authorId && { authorId }),
    }

    const [comments, total] = await prisma.$transaction([
      prisma.comment.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, image: true } },
          pullRequest: {
            select: {
              id: true,
              title: true,
              number: true,
              repoId: true,
              repo: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.comment.count({ where }),
    ])

    return NextResponse.json({
      comments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
