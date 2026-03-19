import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { analyzeReview } from "@/lib/ai/analyze"
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

    // Run analysis synchronously and return result
    await analyzeReview(pullRequestId)

    const completed = await prisma.review.findUnique({
      where: { id: review.id },
    })

    // REVIEW 알림 - PR 소유자에게
    const prOwnerId = pr.repo.userId
    const reviewNotification = await prisma.notification.create({
      data: {
        type: "NEW_REVIEW",
        title: "AI 코드 리뷰가 완료되었습니다",
        message: `"${pr.title}" PR의 AI 코드 리뷰가 완료되었습니다.`,
        userId: prOwnerId,
        prId: pullRequestId,
      },
    })
    emitNotification(prOwnerId, {
      ...reviewNotification,
      createdAt: reviewNotification.createdAt.toISOString(),
    })

    return NextResponse.json(completed)
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
