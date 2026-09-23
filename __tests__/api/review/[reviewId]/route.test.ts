import { GET } from "@/app/api/review/[reviewId]/route"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildAccessiblePullRequestWhere } from "@/lib/repository-access"

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    review: { findFirst: jest.fn() },
  },
}))

jest.mock("@/lib/repository-access", () => ({
  buildAccessiblePullRequestWhere: jest.fn(),
}))

const mockedAuth = auth as jest.Mock
const mockedFindFirst = prisma.review.findFirst as jest.Mock
const mockedBuildAccessiblePullRequestWhere =
  buildAccessiblePullRequestWhere as jest.Mock

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
  beforeEach(() => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessiblePullRequestWhere.mockResolvedValue({
      repoId: { in: ["repo-1"] },
    })
  })

  afterEach(() => jest.clearAllMocks())

  it("returns the requested review with stage information", async () => {
    mockedFindFirst.mockResolvedValue(mockReview)

    const { request, params } = makeRequest("review-1")
    const res = await GET(request, { params })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.id).toBe("review-1")
    expect(body.status).toBe("COMPLETED")
    expect(body.stage).toBe("COMPLETED")
    expect(body.qualityScore).toBe(100)
    expect(body.pullRequest.number).toBe(1)
    expect(mockedFindFirst).toHaveBeenCalledWith({
      where: {
        id: "review-1",
        pullRequest: { is: { repoId: { in: ["repo-1"] } } },
      },
      include: {
        pullRequest: {
          select: { id: true, number: true, title: true, repoId: true },
        },
      },
    })
  })

  it("returns 401 to anonymous users", async () => {
    mockedAuth.mockResolvedValue(null)

    const { request, params } = makeRequest("review-1")
    const res = await GET(request, { params })

    expect(res.status).toBe(401)
    expect(mockedFindFirst).not.toHaveBeenCalled()
  })

  it("returns stage information for pending reviews", async () => {
    mockedFindFirst.mockResolvedValue({
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
    mockedFindFirst.mockResolvedValue(null)

    const { request, params } = makeRequest("not-exist")
    const res = await GET(request, { params })
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBe("Review not found")
  })

  it("does not expose a review outside the user's repositories", async () => {
    mockedFindFirst.mockResolvedValue(null)

    const { request, params } = makeRequest("other-user-review")
    const res = await GET(request, { params })

    expect(res.status).toBe(404)
    expect(mockedFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "other-user-review",
          pullRequest: { is: { repoId: { in: ["repo-1"] } } },
        },
      })
    )
  })

  it("returns 500 on unexpected errors", async () => {
    mockedFindFirst.mockRejectedValue(new Error("DB error"))

    const { request, params } = makeRequest("review-1")
    const res = await GET(request, { params })
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe("Internal server error")
  })
})
