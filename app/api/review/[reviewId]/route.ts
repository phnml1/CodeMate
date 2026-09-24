import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildAccessiblePullRequestWhere } from "@/lib/repository-access"
import type { AIReviewResponse } from "@/lib/ai/parsers"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { reviewId } = await params
    const accessibleWhere = await buildAccessiblePullRequestWhere(session.user.id)

    const review = await prisma.review.findFirst({
      where: {
        id: reviewId,
        pullRequest: { is: accessibleWhere },
      },
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
