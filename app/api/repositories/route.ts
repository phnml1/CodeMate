import { auth } from "@/lib/auth"
import { getOctokit, isGitHubReconnectRequiredError } from "@/lib/github"
import { prisma } from "@/lib/prisma"
import { syncRepositoryPullRequests } from "@/lib/pull-request-sync"
import { getConnectedRepositoriesForUser } from "@/lib/dal/repositories"
import { invalidateDashboardForUsers } from "@/lib/dashboard-cache"
import {
  connectRepositoryToUser,
  getRepositoryMemberIds,
  isRepositoryMembershipMigrationError,
} from "@/lib/repository-access"
import { NextResponse } from "next/server"
import { enforceUserRateLimit, RATE_LIMIT_POLICIES } from "@/lib/rate-limit"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const repositories = await getConnectedRepositoriesForUser(session.user.id)

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

    const rateLimited = await enforceUserRateLimit(
      RATE_LIMIT_POLICIES.repositoryConnect,
      session.user.id
    )
    if (rateLimited) return rateLimited

    const body = await request.json().catch(() => null)
    const githubId = body?.githubId
    if (!Number.isSafeInteger(githubId) || githubId <= 0) {
      return NextResponse.json(
        { error: "A valid githubId is required" },
        { status: 400 }
      )
    }

    // The repository list in the browser is only a display hint. Recheck the
    // authenticated user's explicit GitHub access before granting membership.
    const octokit = await getOctokit(session.user.id)
    const accessibleRepositories = await octokit.paginate(
      octokit.rest.repos.listForAuthenticatedUser,
      { per_page: 100 }
    )
    const githubRepository = accessibleRepositories.find((repo) => repo.id === githubId)
    if (!githubRepository) {
      return NextResponse.json({ error: "Repository not accessible" }, { status: 403 })
    }

    const { name, full_name: fullName, description, language } = githubRepository
    const canAdminister = githubRepository.permissions?.admin === true
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

    if (!repository.webhookId && canAdminister === true) {
      try {
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

    try {
      await syncRepositoryPullRequests({
        octokit,
        owner,
        repo,
        repositoryId: repository.id,
      })
    } catch (error) {
      console.error("[Repository PR sync] failed:", error)
    }

    invalidateDashboardForUsers(await getRepositoryMemberIds(repository.id))

    return NextResponse.json(
      { repository: { ...repository, githubId: Number(repository.githubId) } },
      { status: 201 }
    )
  } catch (error) {
    if (isGitHubReconnectRequiredError(error)) {
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

    console.error("[POST /api/repositories] failed:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
