import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

/**
 * @swagger
 * /api/repositories:
 *   post:
 *     summary: Repository 연동
 *     description: GitHub Repository를 CodeMate에 연동합니다.
 *     tags:
 *       - Repository
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - githubId
 *               - name
 *               - fullName
 *             properties:
 *               githubId:
 *                 type: integer
 *                 description: GitHub Repository ID
 *               name:
 *                 type: string
 *                 description: Repository 이름
 *               fullName:
 *                 type: string
 *                 description: "owner/repo 형식의 전체 이름"
 *               description:
 *                 type: string
 *                 nullable: true
 *               language:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Repository 연동 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 repository:
 *                   $ref: '#/components/schemas/Repository'
 *       400:
 *         description: 필수 필드 누락
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
 *       409:
 *         description: 이미 연동된 Repository
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
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { githubId, name, fullName, description, language } = body

    if (!githubId || !name || !fullName) {
      return NextResponse.json(
        { error: "githubId, name, fullName은 필수 항목입니다" },
        { status: 400 }
      )
    }

    const existing = await prisma.repository.findFirst({
      where: { githubId, userId: session.user.id },
    })

    if (existing) {
      return NextResponse.json(
        { error: "이미 연동된 Repository입니다" },
        { status: 409 }
      )
    }

    const repository = await prisma.repository.create({
      data: {
        githubId,
        name,
        fullName,
        description: description ?? null,
        language: language ?? null,
        userId: session.user.id,
      },
    })

    return NextResponse.json({ repository }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
