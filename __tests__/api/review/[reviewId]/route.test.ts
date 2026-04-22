import { GET } from "@/app/api/review/[reviewId]/route"
import { prisma } from "@/lib/prisma"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    review: { findUnique: jest.fn() },
  },
}))

const mockedFindUnique = prisma.review.findUnique as jest.Mock

const mockReview = {
  id: "review-1",
  pullRequestId: "pr-1",
  status: "COMPLETED",
  stage: "COMPLETED",
  aiSuggestions: { issues: [], summary: "ok", overallAssessment: "APPROVE" },
  qualityScore: 100,
  severity: "LOW",
  issueCount: 0,
  reviewedAt: new Date(),
  pullRequest: { id: "pr-1", number: 1, title: "Fix bug", repoId: "repo-1" },
}

function makeRequest(reviewId: string) {
  return {
    request: new Request(`http://localhost/api/review/${reviewId}`),
    params: Promise.resolve({ reviewId }),
  }
}

describe("GET /api/review/[reviewId]", () => {
  afterEach(() => jest.clearAllMocks())

  it("returns the requested review with stage information", async () => {
    mockedFindUnique.mockResolvedValue(mockReview)

    const { request, params } = makeRequest("review-1")
    const res = await GET(request, { params })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.id).toBe("review-1")
    expect(body.status).toBe("COMPLETED")
    expect(body.stage).toBe("COMPLETED")
    expect(body.qualityScore).toBe(100)
    expect(body.pullRequest.number).toBe(1)
  })

  it("returns stage information for pending reviews", async () => {
    mockedFindUnique.mockResolvedValue({
      ...mockReview,
      status: "PENDING",
      stage: "FETCHING_FILES",
    })

    const { request, params } = makeRequest("review-1")
    const res = await GET(request, { params })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.status).toBe("PENDING")
    expect(body.stage).toBe("FETCHING_FILES")
  })

  it("returns 404 for missing reviews", async () => {
    mockedFindUnique.mockResolvedValue(null)

    const { request, params } = makeRequest("not-exist")
    const res = await GET(request, { params })
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBe("Review not found")
  })

  it("returns 500 on unexpected errors", async () => {
    mockedFindUnique.mockRejectedValue(new Error("DB error"))

    const { request, params } = makeRequest("review-1")
    const res = await GET(request, { params })
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe("Internal server error")
  })
})
