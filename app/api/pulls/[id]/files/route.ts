import { auth } from "@/lib/auth"
import { getOctokit } from "@/lib/github"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

/**
 * @swagger
 * /api/pulls/{id}/files:
 *   get:
 *     summary: PR 변경 파일 목록 조회
 *     description: PR에서 변경된 파일 목록과 Diff(patch)를 반환합니다.
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
 *         description: 파일 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 files:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       filename:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [added, modified, removed, renamed, copied, changed, unchanged]
 *                       additions:
 *                         type: integer
 *                       deletions:
 *                         type: integer
 *                       changes:
 *                         type: integer
 *                       patch:
 *                         type: string
 *                         nullable: true
 *       401:
 *         description: 인증되지 않은 사용자
 *       404:
 *         description: PR을 찾을 수 없음
 *       500:
 *         description: 서버 내부 오류
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
      select: {
        number: true,
        repo: { select: { fullName: true } },
      },
    })

    if (!pr) {
      return NextResponse.json({ error: "PR을 찾을 수 없습니다." }, { status: 404 })
    }

    const octokit = await getOctokit(session.user.id)
    const [owner, repo] = pr.repo.fullName.split("/")

    const { data } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: pr.number,
      per_page: 100,
    })

    const files = data.map(({ filename, status, additions, deletions, changes, patch }) => ({
      filename,
      status,
      additions,
      deletions,
      changes,
      patch: patch ?? null,
    }))

    return NextResponse.json({ files })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
