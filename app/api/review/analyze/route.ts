import { NextResponse } from "next/server"
import { analyzeReview } from "@/lib/ai/analyze"
import { getEnabledUserIds } from "@/lib/notification-settings"
import { prisma } from "@/lib/prisma"
import { getRepositoryMemberIds } from "@/lib/repository-access"
import { emitNotification } from "@/lib/socket/emitter"

async function notifyReviewResult(params: {
  pullRequestId: string
  repoId: string
  prNumber: number
  prTitle: string
  type: "NEW_REVIEW" | "REVIEW_FAILED"
  message: string
}) {
  const repositoryUserIds = await getRepositoryMemberIds(params.repoId)
  const recipientIds = await getEnabledUserIds(
    [...new Set(repositoryUserIds)],
    params.type
  )

  await Promise.all(
    recipientIds.map(async (userId) => {
      const notification = await prisma.notification.create({
        data: {
          type: params.type,
          title:
            params.type === "NEW_REVIEW"
              ? "AI review is ready"
              : "AI review failed",
          message: params.message,
          userId,
          prId: params.pullRequestId,
        },
      })

      emitNotification(userId, {
        ...notification,
        createdAt: notification.createdAt.toISOString(),
        prTitle: params.prTitle,
        prNumber: params.prNumber,
      })
    })
  )
}

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

    void analyzeReview(pullRequestId)
      .then(async (result) => {
        if (result.status === "SKIPPED_ACTIVE") {
          return
        }

        if (result.status === "COMPLETED") {
          await notifyReviewResult({
            pullRequestId,
            repoId: pr.repoId,
            prNumber: pr.number,
            prTitle: pr.title,
            type: "NEW_REVIEW",
            message: `The AI review for "${pr.title}" is complete.`,
          })
          return
        }

        await notifyReviewResult({
          pullRequestId,
          repoId: pr.repoId,
          prNumber: pr.number,
          prTitle: pr.title,
          type: "REVIEW_FAILED",
          message: result.failureReason,
        })
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
