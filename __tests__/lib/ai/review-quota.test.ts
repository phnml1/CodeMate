import { getDailyAiReviewLimit, isAiReviewLimitReached, reserveAiReviewSlot } from "@/lib/ai/review-quota";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: { $transaction: jest.fn(), review: { count: jest.fn() } },
}));

const transaction = prisma.$transaction as jest.Mock;
const originalLimit = process.env.AI_REVIEW_DAILY_LIMIT;

describe("AI review daily quota", () => {
  const tx = {
    $queryRaw: jest.fn(),
    review: { count: jest.fn(), update: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.AI_REVIEW_DAILY_LIMIT;
    transaction.mockImplementation((callback: (client: typeof tx) => Promise<boolean>) => callback(tx));
    tx.review.count.mockResolvedValue(0);
  });

  afterAll(() => {
    if (originalLimit === undefined) delete process.env.AI_REVIEW_DAILY_LIMIT;
    else process.env.AI_REVIEW_DAILY_LIMIT = originalLimit;
  });

  it("uses a conservative default and validates overrides", () => {
    expect(getDailyAiReviewLimit()).toBe(10);
    process.env.AI_REVIEW_DAILY_LIMIT = "0";
    expect(getDailyAiReviewLimit()).toBe(0);
    process.env.AI_REVIEW_DAILY_LIMIT = "unlimited";
    expect(getDailyAiReviewLimit).toThrow();
  });

  it("reserves a slot under a DB transaction lock", async () => {
    expect(await reserveAiReviewSlot("review-1")).toBe(true);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.review.count).toHaveBeenCalledWith({
      where: { aiRequestedAt: { gte: expect.any(Date) } },
    });
    expect(tx.review.update).toHaveBeenCalledWith({
      where: { id: "review-1" },
      data: { aiRequestedAt: expect.any(Date) },
    });
  });

  it("rejects an exhausted quota without reserving a call", async () => {
    tx.review.count.mockResolvedValue(10);
    expect(await reserveAiReviewSlot("review-1")).toBe(false);
    expect(tx.review.update).not.toHaveBeenCalled();
  });

  it("reports exhaustion before scheduling a manual request", async () => {
    tx.review.count.mockResolvedValue(10);
    // The read-only check uses the Prisma client directly.
    (prisma.review.count as jest.Mock).mockResolvedValue(10);
    expect(await isAiReviewLimitReached()).toBe(true);
  });
});
