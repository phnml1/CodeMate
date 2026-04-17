import { auth } from "@/lib/auth"
import { getOctokit } from "@/lib/github"
import { prisma } from "@/lib/prisma"
import { buildAccessibleRepositoryWhere } from "@/lib/repository-access"
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
    const repositoryWhere = await buildAccessibleRepositoryWhere(session.user.id, id)

    const repository = await prisma.repository.findFirst({
      where: repositoryWhere,
      select: { id: true, fullName: true },
    })

    if (!repository) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 })
    }

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

    const results: {
      id: string
      additions: number
      deletions: number
      changedFiles: number
    }[] = []

    for (const pr of unsynced) {
      try {
        const { data } = await octokit.pulls.get({
          owner,
          repo,
          pull_number: pr.number,
        })

        if (
          data.additions === 0 &&
          data.deletions === 0 &&
          data.changed_files === 0
        ) {
          continue
        }

        results.push({
          id: pr.id,
          additions: data.additions,
          deletions: data.deletions,
          changedFiles: data.changed_files,
        })
      } catch {
        // Skip PRs that fail detail hydration and continue.
      }
    }

    if (results.length > 0) {
      await prisma.$transaction(
        results.map((result) =>
          prisma.pullRequest.update({
            where: { id: result.id },
            data: {
              additions: result.additions,
              deletions: result.deletions,
              changedFiles: result.changedFiles,
            },
          })
        )
      )
    }

    return NextResponse.json({ updated: results.length, total: unsynced.length })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
