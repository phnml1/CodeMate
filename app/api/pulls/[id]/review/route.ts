import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildAccessiblePullRequestWhere } from "@/lib/repository-access";
import type { AIReviewResponse } from "@/lib/ai/parsers";
import type { Review } from "@/types/review";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const pullRequestWhere = await buildAccessiblePullRequestWhere(
      session.user.id
    );

    const pullRequest = await prisma.pullRequest.findFirst({
      where: {
        id,
        ...pullRequestWhere,
      },
      select: {
        reviews: {
          select: {
            id: true,
            pullRequestId: true,
            aiSuggestions: true,
            qualityScore: true,
            severity: true,
            issueCount: true,
            status: true,
            stage: true,
            reviewedAt: true,
          },
          take: 1,
          orderBy: { reviewedAt: "desc" },
        },
      },
    });

    if (!pullRequest) {
      return NextResponse.json(
        { error: "Pull request not found" },
        { status: 404 }
      );
    }

    const review = pullRequest.reviews[0];

    if (!review) {
      return NextResponse.json(null);
    }

    const response: Review = {
      ...review,
      aiSuggestions: review.aiSuggestions as AIReviewResponse,
      reviewedAt: review.reviewedAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/pulls/[id]/review]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
