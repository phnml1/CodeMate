import { auth } from "@/lib/auth"
import { getAuthenticatedOctokit } from "@/lib/github"
import { prisma } from "@/lib/prisma"
import {
  buildAccessibleRepositoryWhere,
  isRepositoryMembershipMigrationError,
} from "@/lib/repository-access"
import { NextRequest, NextResponse } from "next/server"

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

    const repositoryWhere = await buildAccessibleRepositoryWhere(session.user.id)

    const connectedRepos = await prisma.repository.findMany({
      where: repositoryWhere,
      select: {
        githubId: true,
        id: true,
      },
    })

    const connectedMap = new Map(
      connectedRepos.map((repository) => [repository.githubId, repository.id])
    )

    const repos = data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      language: repo.language,
      canAdminister: repo.permissions?.admin ?? false,
      isConnected: connectedMap.has(BigInt(repo.id)),
      repositoryId: connectedMap.get(BigInt(repo.id)),
    }))

    return NextResponse.json({
      repos,
      pagination: { page, perPage, hasNextPage },
    })
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      error.status === 401
    ) {
      return NextResponse.json(
        { error: "GitHub authorization expired. Please reconnect GitHub." },
        { status: 401 }
      )
    }

    if (isRepositoryMembershipMigrationError(error)) {
      return NextResponse.json(
        {
          error:
            'Shared repository migration is not applied. Run the "split_repository_membership" migration first.',
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
