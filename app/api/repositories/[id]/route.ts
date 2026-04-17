import { auth } from "@/lib/auth"
import { getOctokit } from "@/lib/github"
import { prisma } from "@/lib/prisma"
import {
  detachRepositoryFromUser,
  getRepositoryMemberCount,
  isRepositoryMembershipMigrationError,
  isRepositoryAccessibleToUser,
} from "@/lib/repository-access"
import { NextResponse } from "next/server"

export async function DELETE(
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
      select: {
        id: true,
        fullName: true,
        webhookId: true,
      },
    })

    if (!repository) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 })
    }

    const isConnected = await isRepositoryAccessibleToUser(session.user.id, id)

    if (!isConnected) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const memberCount = await getRepositoryMemberCount(id)

    if (memberCount > 1) {
      await detachRepositoryFromUser(session.user.id, id)

      return NextResponse.json({
        message: "Repository connection removed.",
      })
    }

    if (repository.webhookId) {
      try {
        const [owner, repo] = repository.fullName.split("/")
        const octokit = await getOctokit(session.user.id)
        await octokit.rest.repos.deleteWebhook({
          owner,
          repo,
          hook_id: repository.webhookId,
        })
      } catch {
        // Continue deleting the local repository record even if webhook cleanup fails.
      }
    }

    await prisma.repository.delete({ where: { id } })

    return NextResponse.json({
      message: "Repository removed.",
    })
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

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
