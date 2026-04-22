import { POST } from "@/app/api/review/analyze/route"
import { prisma } from "@/lib/prisma"
import * as analyzeModule from "@/lib/ai/analyze"
import { getRepositoryMemberIds } from "@/lib/repository-access"
import * as reviewNotificationsModule from "@/lib/review-notifications"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    pullRequest: { findUnique: jest.fn() },
  },
}))

jest.mock("@/lib/ai/analyze", () => ({
  analyzeReview: jest.fn(),
}))

jest.mock("@/lib/socket/emitter", () => ({
  emitNotification: jest.fn(),
}))

jest.mock("@/lib/notification-settings", () => ({
  getEnabledUserIds: jest.fn().mockResolvedValue(["user-1"]),
}))

jest.mock("@/lib/repository-access", () => ({
  getRepositoryMemberIds: jest.fn().mockResolvedValue(["user-1"]),
}))

jest.mock("@/lib/review-notifications", () => ({
  upsertReviewNotifications: jest.fn().mockResolvedValue(undefined),
}))

const mockedFindUnique = prisma.pullRequest.findUnique as jest.Mock
const mockedAnalyze = analyzeModule.analyzeReview as jest.Mock
const mockedGetRepositoryMemberIds = getRepositoryMemberIds as jest.Mock
const mockedUpsertReviewNotifications =
  reviewNotificationsModule.upsertReviewNotifications as jest.Mock

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
  number: 42,
  repoId: "repo-1",
}

describe("POST /api/review/analyze", () => {
  afterEach(() => jest.clearAllMocks())

  it("starts review analysis and returns PENDING", async () => {
    mockedFindUnique.mockResolvedValue(mockPR)
    mockedAnalyze.mockResolvedValue({ status: "COMPLETED" })

    const res = await POST(makeRequest({ pullRequestId: "pr-1" }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.status).toBe("PENDING")
    expect(mockedAnalyze).toHaveBeenCalledWith("pr-1")
    expect(mockedGetRepositoryMemberIds).toHaveBeenCalledWith("repo-1")
    expect(mockedUpsertReviewNotifications).toHaveBeenCalledWith({
      userIds: ["user-1"],
      prId: "pr-1",
      prTitle: "Fix bug",
      prNumber: 42,
      status: "PENDING",
    })
  })

  it("returns 400 when pullRequestId is missing", async () => {
    const res = await POST(makeRequest({}))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe("pullRequestId is required")
    expect(mockedAnalyze).not.toHaveBeenCalled()
  })

  it("returns 404 when the pull request does not exist", async () => {
    mockedFindUnique.mockResolvedValue(null)

    const res = await POST(makeRequest({ pullRequestId: "not-exist" }))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBe("Pull request not found")
  })

  it("returns 500 on unexpected errors", async () => {
    mockedFindUnique.mockRejectedValue(new Error("DB error"))

    const res = await POST(makeRequest({ pullRequestId: "pr-1" }))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe("Internal server error")
  })
})
