import { auth } from "@/lib/auth"
import { getOctokit } from "@/lib/github"
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
      where: { githubId: BigInt(githubId), userId: session.user.id },
    })

    if (existing) {
      return NextResponse.json(
        { error: "이미 연동된 Repository입니다" },
        { status: 409 }
      )
    }

    const repository = await prisma.repository.create({
      data: {
        githubId: BigInt(githubId),
        name,
        fullName,
        description: description ?? null,
        language: language ?? null,
        userId: session.user.id,
      },
    })

    const [owner, repo] = fullName.split("/")

    // Webhook 등록
    try {
      const octokit = await getOctokit(session.user.id)
      const { data: hook } = await octokit.rest.repos.createWebhook({
        owner,
        repo,
        config: {
          url: `${process.env.NEXTAUTH_URL}/api/webhook/github`,
          content_type: "json",
          secret: process.env.GITHUB_WEBHOOK_SECRET,
        },
        events: ["pull_request"],
        active: true,
      })
      await prisma.repository.update({
        where: { id: repository.id },
        data: { webhookId: hook.id },
      })
      repository.webhookId = hook.id
    } catch (err) {
      console.warn("[Webhook] 등록 실패 (로컬 환경에서는 정상):", err)
    }

    // 기존 PR Backfill: 연동 시점 이전에 생성된 PR을 DB에 동기화
    try {
      const octokit = await getOctokit(session.user.id)
      const { data: prs } = await octokit.rest.pulls.list({
        owner,
        repo,
        state: "all",
        per_page: 100,
        sort: "updated",
        direction: "desc",
      })

      console.log(`[Backfill] ${fullName}: GitHub에서 PR ${prs.length}개 조회됨`)

      if (prs.length > 0) {
        const result = await prisma.pullRequest.createMany({
          data: prs.map((pr) => ({
            githubId: BigInt(pr.id),
            number: pr.number,
            title: pr.title,
            description: pr.body ?? null,
            // PR 목록 API는 merged 필드가 없으므로 merged_at으로 판단
            status: pr.draft
              ? "DRAFT"
              : pr.state === "closed"
                ? pr.merged_at ? "MERGED" : "CLOSED"
                : "OPEN",
            baseBranch: pr.base.ref,
            headBranch: pr.head.ref,
            // 목록 API는 additions/deletions 미제공 → 0으로 초기화
            additions: 0,
            deletions: 0,
            changedFiles: 0,
            mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
            closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
            repoId: repository.id,
          })),
          skipDuplicates: true,
        })
        console.log(`[Backfill] DB에 PR ${result.count}개 저장됨`)
      }
    } catch (err) {
      console.error("[Backfill] PR 동기화 실패:", err)
    }

    return NextResponse.json({ repository }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
