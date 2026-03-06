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

  it("유효한 reviewId로 리뷰 결과를 반환한다", async () => {
    mockedFindUnique.mockResolvedValue(mockReview)

    const { request, params } = makeRequest("review-1")
    const res = await GET(request, { params })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.id).toBe("review-1")
    expect(body.status).toBe("COMPLETED")
    expect(body.qualityScore).toBe(100)
    expect(body.pullRequest.number).toBe(1)
  })

  it("PENDING 상태 리뷰도 status 포함하여 반환한다", async () => {
    mockedFindUnique.mockResolvedValue({ ...mockReview, status: "PENDING" })

    const { request, params } = makeRequest("review-1")
    const res = await GET(request, { params })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.status).toBe("PENDING")
  })

  it("존재하지 않는 reviewId면 404를 반환한다", async () => {
    mockedFindUnique.mockResolvedValue(null)

    const { request, params } = makeRequest("not-exist")
    const res = await GET(request, { params })
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBe("Review not found")
  })

  it("서버 에러 시 500을 반환한다", async () => {
    mockedFindUnique.mockRejectedValue(new Error("DB error"))

    const { request, params } = makeRequest("review-1")
    const res = await GET(request, { params })
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe("Internal server error")
  })
})
