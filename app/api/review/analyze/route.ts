import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { analyzeReview } from "@/lib/ai/analyze"
import { emitNotification } from "@/lib/socket/emitter"
import { isNotificationEnabled } from "@/lib/notification-settings"

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
      include: { repo: { select: { userId: true } } },
    })

    if (!pr) {
      return NextResponse.json(
        { error: "PullRequest not found" },
        { status: 404 }
      )
    }

    // Create PENDING review record upfront
    const review = await prisma.review.create({
      data: {
        pullRequestId,
        status: "PENDING",
        aiSuggestions: {},
        qualityScore: 0,
        severity: "LOW",
        issueCount: 0,
      },
    })

    const prOwnerId = pr.repo.userId

    // Fire-and-forget: respond immediately, notify when done
    analyzeReview(pullRequestId)
      .then(async () => {
        if (!(await isNotificationEnabled(prOwnerId, "NEW_REVIEW"))) return
        const notification = await prisma.notification.create({
          data: {
            type: "NEW_REVIEW",
            title: "AI 코드 리뷰가 완료되었습니다",
            message: `"${pr.title}" PR의 AI 코드 리뷰가 완료되었습니다.`,
            userId: prOwnerId,
            prId: pullRequestId,
          },
        })
        emitNotification(prOwnerId, {
          ...notification,
          createdAt: notification.createdAt.toISOString(),
        })
      })
      .catch((err) => console.error("[analyze] analyzeReview failed:", err))

    return NextResponse.json({ reviewId: review.id, status: "PENDING" })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
