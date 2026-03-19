import { POST } from "@/app/api/review/analyze/route"
import { prisma } from "@/lib/prisma"
import * as analyzeModule from "@/lib/ai/analyze"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    pullRequest: { findUnique: jest.fn() },
    review: { create: jest.fn(), findUnique: jest.fn() },
    notification: { create: jest.fn() },
  },
}))

jest.mock("@/lib/ai/analyze", () => ({
  analyzeReview: jest.fn(),
}))

jest.mock("@/lib/socket/emitter", () => ({
  emitNotification: jest.fn(),
}))

jest.mock("@/lib/notification-settings", () => ({
  isNotificationEnabled: jest.fn().mockResolvedValue(true),
}))

const mockedFindUnique = prisma.pullRequest.findUnique as jest.Mock
const mockedReviewCreate = prisma.review.create as jest.Mock
const mockedAnalyze = analyzeModule.analyzeReview as jest.Mock

function makeRequest(body: object) {
  return new Request("http://localhost/api/review/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

const mockPR = {
  id: "pr-1",
  title: "Fix bug",
  repo: { userId: "user-1" },
}

describe("POST /api/review/analyze", () => {
  afterEach(() => jest.clearAllMocks())

  it("유효한 pullRequestId로 리뷰 분석을 백그라운드에서 실행하고 PENDING을 반환한다", async () => {
    mockedFindUnique.mockResolvedValue(mockPR)
    mockedReviewCreate.mockResolvedValue({ id: "review-1" })
    mockedAnalyze.mockResolvedValue(undefined)

    const res = await POST(makeRequest({ pullRequestId: "pr-1" }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.reviewId).toBe("review-1")
    expect(body.status).toBe("PENDING")
    expect(mockedAnalyze).toHaveBeenCalledWith("pr-1")
  })

  it("pullRequestId 없으면 400을 반환한다", async () => {
    const res = await POST(makeRequest({}))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe("pullRequestId is required")
    expect(mockedAnalyze).not.toHaveBeenCalled()
  })

  it("존재하지 않는 pullRequestId면 404를 반환한다", async () => {
    mockedFindUnique.mockResolvedValue(null)

    const res = await POST(makeRequest({ pullRequestId: "not-exist" }))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBe("PullRequest not found")
  })

  it("서버 에러 시 500을 반환한다", async () => {
    mockedFindUnique.mockRejectedValue(new Error("DB error"))

    const res = await POST(makeRequest({ pullRequestId: "pr-1" }))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe("Internal server error")
  })
})
