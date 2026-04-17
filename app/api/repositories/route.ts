import { auth } from "@/lib/auth"
import { getOctokit } from "@/lib/github"
import { prisma } from "@/lib/prisma"
import {
  buildAccessibleRepositoryWhere,
  connectRepositoryToUser,
  isRepositoryMembershipMigrationError,
} from "@/lib/repository-access"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const repositoryWhere = await buildAccessibleRepositoryWhere(session.user.id)

    const repositories = await prisma.repository.findMany({
      where: repositoryWhere,
      select: { id: true, name: true, fullName: true },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ repositories })
  } catch (error) {
    if (isRepositoryMembershipMigrationError(error)) {
      return NextResponse.json(
        {
          error:
            'Shared repository migration is not applied. Run the "split_repository_membership" migration first.',
        },
        { status: 503 }
      )
    }

    console.error("[GET /api/repositories] failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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
        { error: "githubId, name, fullName are required" },
        { status: 400 }
      )
    }

    const parsedGithubId = BigInt(githubId)
    let repository = await prisma.repository.findUnique({
      where: { githubId: parsedGithubId },
      select: {
        id: true,
        githubId: true,
        name: true,
        fullName: true,
        description: true,
        language: true,
        webhookId: true,
      },
    })

    if (repository) {
      const connectionResult = await connectRepositoryToUser(
        session.user.id,
        repository.id
      )

      if (connectionResult === "existing") {
        return NextResponse.json(
          { error: "Repository is already connected" },
          { status: 409 }
        )
      }
    } else {
      repository = await prisma.repository.create({
        data: {
          githubId: parsedGithubId,
          name,
          fullName,
          description: description ?? null,
          language: language ?? null,
          userRepositories: {
            create: {
              userId: session.user.id,
            },
          },
        },
        select: {
          id: true,
          githubId: true,
          name: true,
          fullName: true,
          description: true,
          language: true,
          webhookId: true,
        },
      })
    }

    if (!repository) {
      throw new Error("Repository creation failed")
    }

    const [owner, repo] = fullName.split("/")

    if (!repository.webhookId) {
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

        repository = await prisma.repository.update({
          where: { id: repository.id },
          data: { webhookId: hook.id },
          select: {
            id: true,
            githubId: true,
            name: true,
            fullName: true,
            description: true,
            language: true,
            webhookId: true,
          },
        })
      } catch (error) {
        console.warn("[Webhook] registration failed:", error)
      }
    }

    const existingPullRequestCount = await prisma.pullRequest.count({
      where: { repoId: repository.id },
    })

    if (existingPullRequestCount === 0) {
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

        if (prs.length > 0) {
          await prisma.pullRequest.createMany({
            data: prs.map((pr) => ({
              githubId: BigInt(pr.id),
              number: pr.number,
              title: pr.title,
              description: pr.body ?? null,
              status: pr.draft
                ? "DRAFT"
                : pr.state === "closed"
                  ? pr.merged_at
                    ? "MERGED"
                    : "CLOSED"
                  : "OPEN",
              baseBranch: pr.base.ref,
              headBranch: pr.head.ref,
              additions: 0,
              deletions: 0,
              changedFiles: 0,
              mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
              closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
              githubCreatedAt: pr.created_at ? new Date(pr.created_at) : null,
              githubUpdatedAt: pr.updated_at ? new Date(pr.updated_at) : null,
              repoId: repository.id,
            })),
            skipDuplicates: true,
          })
        }
      } catch (error) {
        console.error("[Backfill] failed:", error)
      }
    }

    return NextResponse.json(
      { repository: { ...repository, githubId: Number(repository.githubId) } },
      { status: 201 }
    )
  } catch (error) {
    if (isRepositoryMembershipMigrationError(error)) {
      return NextResponse.json(
        {
          error:
            'Shared repository migration is not applied. Run the "split_repository_membership" migration first.',
        },
        { status: 503 }
      )
    }

    console.error("[POST /api/repositories] failed:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
