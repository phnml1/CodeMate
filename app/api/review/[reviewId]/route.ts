import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { AIReviewResponse } from "@/lib/ai/parsers"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await params

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        pullRequest: {
          select: { id: true, number: true, title: true, repoId: true },
        },
      },
    })

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    return NextResponse.json({
      ...review,
      aiSuggestions: review.aiSuggestions as AIReviewResponse,
    })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
