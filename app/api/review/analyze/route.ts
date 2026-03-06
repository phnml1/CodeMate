import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { analyzeReview } from "@/lib/ai/analyze"

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

    return NextResponse.json(completed)
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
