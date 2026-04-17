import { auth } from "@/lib/auth"
import { getOctokit } from "@/lib/github"
import { prisma } from "@/lib/prisma"
import {
  buildAccessiblePullRequestWhere,
  getRepositoryPrimaryUser,
} from "@/lib/repository-access"
import { NextResponse } from "next/server"

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
    const pullRequestWhere = await buildAccessiblePullRequestWhere(
      session.user.id
    )

    const pr = await prisma.pullRequest.findFirst({
      where: {
        id,
        ...pullRequestWhere,
      },
      include: {
        repo: {
          select: {
            id: true,
            name: true,
            fullName: true,
          },
        },
        reviews: {
          select: {
            id: true,
            status: true,
            qualityScore: true,
            issueCount: true,
            severity: true,
            reviewedAt: true,
          },
          take: 1,
          orderBy: { reviewedAt: "desc" },
        },
      },
    })

    if (!pr) {
      return NextResponse.json({ error: "Pull request not found" }, { status: 404 })
    }

    const owner = await getRepositoryPrimaryUser(pr.repo.id)

    let { additions, deletions, changedFiles } = pr

    if (additions === 0 && deletions === 0 && changedFiles === 0) {
      try {
        const octokit = await getOctokit(session.user.id)
        const [ownerName, repoName] = pr.repo.fullName.split("/")
        const { data } = await octokit.pulls.get({
          owner: ownerName,
          repo: repoName,
          pull_number: pr.number,
        })

        additions = data.additions
        deletions = data.deletions
        changedFiles = data.changed_files

        prisma.pullRequest
          .update({ where: { id }, data: { additions, deletions, changedFiles } })
          .catch(() => {})
      } catch {
        // Keep stored values when GitHub hydration fails.
      }
    }

    const { githubId, repo: repository, ...rest } = pr

    return NextResponse.json({
      ...rest,
      githubId: Number(githubId),
      additions,
      deletions,
      changedFiles,
      repo: {
        id: repository.id,
        name: repository.name,
        fullName: repository.fullName,
        owner,
      },
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
