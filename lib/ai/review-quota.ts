import { prisma } from "@/lib/prisma";

// Shared across all app instances. A transaction-level lock serializes reservations.
const AI_REVIEW_QUOTA_LOCK = 48493117;
const DEFAULT_DAILY_LIMIT = 10;

export function getDailyAiReviewLimit(): number {
  const configured = process.env.AI_REVIEW_DAILY_LIMIT;
  if (configured === undefined || configured === "") return DEFAULT_DAILY_LIMIT;
  const limit = Number(configured);
  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new Error("AI_REVIEW_DAILY_LIMIT must be a nonnegative integer");
  }
  return limit;
}

export async function isAiReviewLimitReached(): Promise<boolean> {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const used = await prisma.review.count({ where: { aiRequestedAt: { gte: start } } });
  return used >= getDailyAiReviewLimit();
}

export async function reserveAiReviewSlot(reviewId: string): Promise<boolean> {
  const limit = getDailyAiReviewLimit();
  return prisma.$transaction(async (tx) => {
    // Return an integer; Prisma cannot decode PostgreSQL's void lock result.
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(${AI_REVIEW_QUOTA_LOCK})`;
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const used = await tx.review.count({ where: { aiRequestedAt: { gte: start } } });
    if (used >= limit) return false;
    await tx.review.update({
      where: { id: reviewId },
      data: { aiRequestedAt: now },
    });
    return true;
  });
}
