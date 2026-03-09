import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { AIReviewResponse } from "@/lib/ai/parsers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const review = await prisma.review.findFirst({
      where: { pullRequestId: id },
      orderBy: { reviewedAt: "desc" },
    });

    if (!review) {
      return NextResponse.json(null);
    }

    return NextResponse.json({
      ...review,
      aiSuggestions: review.aiSuggestions as AIReviewResponse,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
