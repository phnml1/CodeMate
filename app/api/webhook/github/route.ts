import { revalidateTag } from "next/cache"
import { NextResponse, after } from "next/server"
import { analyzeReview } from "@/lib/ai/analyze"
import { getEnabledUserIds } from "@/lib/notification-settings"
import { prisma } from "@/lib/prisma"
import { getRepositoryMemberIds } from "@/lib/repository-access"
import { emitNotification } from "@/lib/socket/emitter"
import { verifyWebhookSignature } from "@/lib/webhook-validator"

export const maxDuration = 300

function safeRevalidateDashboard(userId: string) {
  try {
    revalidateTag(`dashboard-${userId}`, "max")
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    if (message.includes("static generation store missing")) {
      return
    }

    throw error
  }
}

function getPRStatus(pr: {
  state: string
  draft: boolean
  merged: boolean
}): "OPEN" | "CLOSED" | "MERGED" | "DRAFT" {
  if (pr.draft) return "DRAFT"
  if (pr.state === "closed") return pr.merged ? "MERGED" : "CLOSED"
  return "OPEN"
}

async function notifyUsers(params: {
  userIds: string[]
  type: "NEW_REVIEW" | "PR_MERGED" | "REVIEW_FAILED"
  title: string
  message: string
  prId: string
  prTitle: string
  prNumber: number
}) {
  const recipients = await getEnabledUserIds(params.userIds, params.type)

  await Promise.all(
    recipients.map(async (userId) => {
      const notification = await prisma.notification.create({
        data: {
          type: params.type,
          title: params.title,
          message: params.message,
          userId,
          prId: params.prId,
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
    const payload = await request.text()
    const signature = request.headers.get("x-hub-signature-256") ?? ""
    const event = request.headers.get("x-github-event") ?? ""

    const isValid = await verifyWebhookSignature(payload, signature)
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      )
    }

    if (event !== "pull_request") {
      return NextResponse.json({ message: "Event ignored" })
    }

    const body = JSON.parse(payload)
    const { action, pull_request: pr, repository: repo } = body

    const isStatusChange = action === "closed"
    if (action !== "opened" && action !== "synchronize" && !isStatusChange) {
      return NextResponse.json({ message: "Action ignored" })
    }

    const repository = await prisma.repository.findFirst({
      where: { githubId: BigInt(repo.id) },
      select: { id: true },
    })

    if (!repository) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      )
    }

    const recipientIds = [...new Set(await getRepositoryMemberIds(repository.id))]

    const pullRequest = await prisma.pullRequest.upsert({
      where: { githubId: BigInt(pr.id) },
      update: {
        title: pr.title,
        description: pr.body ?? null,
        status: getPRStatus({
          state: pr.state,
          draft: pr.draft,
          merged: pr.merged,
        }),
        additions: pr.additions ?? 0,
        deletions: pr.deletions ?? 0,
        changedFiles: pr.changed_files ?? 0,
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
        githubCreatedAt: pr.created_at ? new Date(pr.created_at) : null,
        githubUpdatedAt: pr.updated_at ? new Date(pr.updated_at) : null,
      },
      create: {
        githubId: BigInt(pr.id),
        number: pr.number,
        title: pr.title,
        description: pr.body ?? null,
        status: getPRStatus({
          state: pr.state,
          draft: pr.draft,
          merged: pr.merged,
        }),
        baseBranch: pr.base.ref,
        headBranch: pr.head.ref,
        additions: pr.additions ?? 0,
        deletions: pr.deletions ?? 0,
        changedFiles: pr.changed_files ?? 0,
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
        githubCreatedAt: pr.created_at ? new Date(pr.created_at) : null,
        githubUpdatedAt: pr.updated_at ? new Date(pr.updated_at) : null,
        repoId: repository.id,
      },
    })

    if (isStatusChange) {
      const isMerged =
        getPRStatus({
          state: pr.state,
          draft: pr.draft,
          merged: pr.merged,
        }) === "MERGED"

      if (recipientIds.length > 0) {
        await notifyUsers({
          userIds: recipientIds,
          type: "PR_MERGED",
          title: isMerged ? "PR merged" : "PR closed",
          message: `"${pr.title}" was ${isMerged ? "merged" : "closed"}.`,
          prId: pullRequest.id,
          prTitle: pr.title,
          prNumber: pr.number,
        })
      }

      recipientIds.forEach((userId) => safeRevalidateDashboard(userId))
      return NextResponse.json({ message: "PR status processed" })
    }

    after(async () => {
      try {
        const result = await analyzeReview(pullRequest.id)
        recipientIds.forEach((userId) => safeRevalidateDashboard(userId))

        if (recipientIds.length === 0 || result.status === "SKIPPED_ACTIVE") return

        if (result.status === "FAILED") {
          await notifyUsers({
            userIds: recipientIds,
            type: "REVIEW_FAILED",
            title: "AI review failed",
            message: result.failureReason,
            prId: pullRequest.id,
            prTitle: pr.title,
            prNumber: pr.number,
          })
          return
        }

        await notifyUsers({
          userIds: recipientIds,
          type: "NEW_REVIEW",
          title: "AI review is ready",
          message: `The AI review for "${pr.title}" is complete.`,
          prId: pullRequest.id,
          prTitle: pr.title,
          prNumber: pr.number,
        })
      } catch (error) {
        console.error("[webhook] analyzeReview failed:", error)
      }
    })

    return NextResponse.json({ message: "PR processed" })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
