import { auth } from "@/lib/auth"
import { getAuthenticatedOctokit } from "@/lib/github"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

/**
 * @swagger
 * /api/github/repos:
 *   get:
 *     summary: GitHub Repository 목록 조회
 *     description: 인증된 사용자의 GitHub Repository 목록을 반환하며, CodeMate 연동 여부를 포함합니다.
 *     tags:
 *       - GitHub
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: per_page
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Repository 목록 반환 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 repos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GitHubRepo'
 *                 pagination:
 *                   $ref: '#/components/schemas/RepoPagination'
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
export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = req.nextUrl
    const page = Math.max(1, Number(searchParams.get("page") ?? 1))
    const perPage = Math.min(100, Math.max(1, Number(searchParams.get("per_page") ?? 20)))

    const octokit = await getAuthenticatedOctokit()

    const { data, headers } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: perPage,
      page,
    })

    const hasNextPage = !!headers.link?.includes('rel="next"')

    const connectedRepos = await prisma.repository.findMany({
      where: { userId: session.user.id },
      select: { githubId: true },
    })
    const connectedIds = new Set(connectedRepos.map((r) => r.githubId))

    const repos = data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      language: repo.language,
      isConnected: connectedIds.has(repo.id),
    }))

    return NextResponse.json({
      repos,
      pagination: { page, perPage, hasNextPage },
    })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
