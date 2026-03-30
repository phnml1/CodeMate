import { auth } from "@/lib/auth"
import { getOctokit } from "@/lib/github"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(
  _request: Request,
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
      select: { id: true, userId: true, fullName: true },
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

    // additions=0 AND deletions=0 AND changedFiles=0 인 PR만 보정 대상
    const unsynced = await prisma.pullRequest.findMany({
      where: {
        repoId: id,
        additions: 0,
        deletions: 0,
        changedFiles: 0,
      },
      select: { id: true, number: true },
    })

    if (unsynced.length === 0) {
      return NextResponse.json({ updated: 0, total: 0 })
    }

    const [owner, repo] = repository.fullName.split("/")
    const octokit = await getOctokit(session.user.id)

    let updated = 0

    for (const pr of unsynced) {
      try {
        const { data } = await octokit.pulls.get({
          owner,
          repo,
          pull_number: pr.number,
        })

        // GitHub API가 반환하는 값이 실제로도 0인 PR은 건너뜀 (진짜 변경 없는 PR)
        if (data.additions === 0 && data.deletions === 0 && data.changed_files === 0) {
          continue
        }

        await prisma.pullRequest.update({
          where: { id: pr.id },
          data: {
            additions: data.additions,
            deletions: data.deletions,
            changedFiles: data.changed_files,
          },
        })
        updated++
      } catch {
        // 개별 PR 보정 실패는 건너뛰고 계속 진행
      }
    }

    return NextResponse.json({ updated, total: unsynced.length })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
