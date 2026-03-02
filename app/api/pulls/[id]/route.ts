import { auth } from "@/lib/auth"
import { getOctokit } from "@/lib/github"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

/**
 * @swagger
 * /api/pulls/{id}:
 *   get:
 *     summary: PR 상세 조회
 *     description: PR 상세 정보를 반환합니다. additions/deletions/changedFiles가 모두 0이면 GitHub API로 실시간 보정합니다.
 *     tags:
 *       - PullRequest
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: PR ID (DB)
 *     responses:
 *       200:
 *         description: PR 상세 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PullRequest'
 *       401:
 *         description: 인증되지 않은 사용자
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: PR을 찾을 수 없음
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
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const pr = await prisma.pullRequest.findFirst({
      where: {
        id,
        repo: { userId: session.user.id },
      },
      include: {
        repo: {
          select: { id: true, name: true, fullName: true },
        },
        reviews: true,
      },
    })

    if (!pr) {
      return NextResponse.json({ error: "PR을 찾을 수 없습니다." }, { status: 404 })
    }

    let { additions, deletions, changedFiles } = pr

    // additions/deletions/changedFiles가 모두 0이면 GitHub API로 실시간 보정
    if (additions === 0 && deletions === 0 && changedFiles === 0) {
      try {
        const octokit = await getOctokit(session.user.id)
        const [owner, repo] = pr.repo.fullName.split("/")
        const { data } = await octokit.pulls.get({
          owner,
          repo,
          pull_number: pr.number,
        })

        additions = data.additions
        deletions = data.deletions
        changedFiles = data.changed_files

        // DB 보정값 저장 (fire-and-forget)
        prisma.pullRequest
          .update({ where: { id }, data: { additions, deletions, changedFiles } })
          .catch(() => {})
      } catch {
        // GitHub API 실패 시 DB 값(0)을 그대로 반환
      }
    }

    const { githubId, ...rest } = pr

    return NextResponse.json({
      ...rest,
      githubId: Number(githubId),
      additions,
      deletions,
      changedFiles,
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
