import { getReviewProgressDisplay } from "@/lib/review-progress";

const startedAt = "2026-11-04T05:00:00.000Z";
const aiStartedAt = "2026-11-04T05:00:08.000Z";

describe("getReviewProgressDisplay", () => {
  it("advances gradually within file collection and AI analysis", () => {
    expect(getReviewProgressDisplay("FETCHING_FILES", startedAt, Date.parse(startedAt)).percentage).toBe(15);
    expect(getReviewProgressDisplay("FETCHING_FILES", startedAt, Date.parse(startedAt) + 6000).percentage).toBe(24);
    expect(getReviewProgressDisplay("ANALYZING", startedAt, Date.parse(aiStartedAt), aiStartedAt).percentage).toBe(35);
    expect(getReviewProgressDisplay("ANALYZING", startedAt, Date.parse(aiStartedAt) + 5000, aiStartedAt).percentage).toBe(45);
  });

  it("holds below completion while the server is still analyzing", () => {
    const later = Date.parse(aiStartedAt) + 120000;
    expect(getReviewProgressDisplay("ANALYZING", startedAt, later, aiStartedAt).percentage).toBe(89);
    expect(getReviewProgressDisplay("FINALIZING", startedAt, later).percentage).toBe(95);
    expect(getReviewProgressDisplay("COMPLETED", startedAt, later).percentage).toBe(100);
  });
});
