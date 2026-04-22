import { auth } from "@/lib/auth"
import {
  getOctokit,
  isGitHubReconnectRequiredError,
} from "@/lib/github"
import { prisma } from "@/lib/prisma"
import { buildAccessiblePullRequestWhere } from "@/lib/repository-access"
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
      select: {
        number: true,
        repo: { select: { fullName: true } },
      },
    })

    if (!pr) {
      return NextResponse.json({ error: "Pull request not found" }, { status: 404 })
    }

    const octokit = await getOctokit(session.user.id)
    const [owner, repo] = pr.repo.fullName.split("/")

    const { data } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: pr.number,
      per_page: 100,
    })

    const files = data.map(
      ({ filename, status, additions, deletions, changes, patch }) => ({
        filename,
        status,
        additions,
        deletions,
        changes,
        patch: patch ?? null,
      })
    )

    return NextResponse.json({ files })
  } catch (error) {
    if (isGitHubReconnectRequiredError(error)) {
      return NextResponse.json(
        {
          error:
            "GitHub authorization expired. Please log out and sign in again.",
          code: "GITHUB_REAUTH_REQUIRED",
        },
        { status: 401 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
