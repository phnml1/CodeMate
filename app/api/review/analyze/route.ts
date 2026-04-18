import { NextResponse } from "next/server"
import { analyzeReview } from "@/lib/ai/analyze"
import { getEnabledUserIds } from "@/lib/notification-settings"
import { prisma } from "@/lib/prisma"
import { getRepositoryMemberIds } from "@/lib/repository-access"
import { emitNotification } from "@/lib/socket/emitter"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { pullRequestId } = body as { pullRequestId?: string }

    if (!pullRequestId) {
      return NextResponse.json(
        { error: "pullRequestId is required" },
        { status: 400 }
      )
    }

    const pr = await prisma.pullRequest.findUnique({
      where: { id: pullRequestId },
      select: {
        id: true,
        title: true,
        number: true,
        repoId: true,
      },
    })

    if (!pr) {
      return NextResponse.json(
        { error: "Pull request not found" },
        { status: 404 }
      )
    }

    analyzeReview(pullRequestId)
      .then(async () => {
        const repositoryUserIds = await getRepositoryMemberIds(pr.repoId)
        const recipientIds = await getEnabledUserIds(
          [...new Set(repositoryUserIds)],
          "NEW_REVIEW"
        )

        await Promise.all(
          recipientIds.map(async (userId) => {
            const notification = await prisma.notification.create({
              data: {
                type: "NEW_REVIEW",
                title: "AI review is ready",
                message: `The AI review for "${pr.title}" is complete.`,
                userId,
                prId: pullRequestId,
              },
            })

            emitNotification(userId, {
              ...notification,
              createdAt: notification.createdAt.toISOString(),
              prTitle: pr.title,
              prNumber: pr.number,
            })
          })
        )
      })
      .catch((error) => console.error("[analyze] analyzeReview failed:", error))

    return NextResponse.json({ status: "PENDING" })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
