import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

const VALID_STATUSES = ["OPEN", "CLOSED", "MERGED", "DRAFT"] as const
type PRStatus = (typeof VALID_STATUSES)[number]
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

/**
 * @swagger
 * /api/pulls:
 *   get:
 *     summary: PR 목록 조회
 *     description: 로그인한 유저의 연동된 저장소 PR 목록을 반환합니다. 저장소별/상태별 필터 및 페이지네이션을 지원합니다.
 *     tags:
 *       - PullRequest
 *     parameters:
 *       - in: query
 *         name: repoId
 *         schema:
 *           type: string
 *         description: 특정 저장소 ID로 필터링 (없으면 전체 저장소)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, CLOSED, MERGED, DRAFT]
 *         description: PR 상태로 필터링
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *         description: 페이지당 항목 수
 *     responses:
 *       200:
 *         description: PR 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pullRequests:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PullRequest'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       400:
 *         description: 유효하지 않은 파라미터
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 인증되지 않은 사용자
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
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    const repoId = searchParams.get("repoId") ?? undefined
    const statusParam = searchParams.get("status") ?? undefined
    const pageParam = parseInt(searchParams.get("page") ?? "1", 10)
    const limitParam = parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10)

    if (statusParam && !VALID_STATUSES.includes(statusParam as PRStatus)) {
      return NextResponse.json(
        { error: `유효하지 않은 status 값입니다. 허용값: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      )
    }

    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam
    const limit = isNaN(limitParam) || limitParam < 1 ? DEFAULT_LIMIT : Math.min(limitParam, MAX_LIMIT)

    const where = {
      repo: { userId: session.user.id },
      ...(repoId && { repoId }),
      ...(statusParam && { status: statusParam as PRStatus }),
    }

    const [total, pullRequests] = await Promise.all([
      prisma.pullRequest.count({ where }),
      prisma.pullRequest.findMany({
        where,
        include: {
          repo: {
            select: { id: true, name: true, fullName: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return NextResponse.json({
      pullRequests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
