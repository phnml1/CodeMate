import { POST } from "@/app/api/review/analyze/route"
import { prisma } from "@/lib/prisma"
import * as analyzeModule from "@/lib/ai/analyze"
import { getRepositoryMemberIds } from "@/lib/repository-access"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    pullRequest: { findUnique: jest.fn() },
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
  getEnabledUserIds: jest.fn().mockResolvedValue(["user-1"]),
}))

jest.mock("@/lib/repository-access", () => ({
  getRepositoryMemberIds: jest.fn().mockResolvedValue(["user-1"]),
}))

const mockedFindUnique = prisma.pullRequest.findUnique as jest.Mock
const mockedNotificationCreate = prisma.notification.create as jest.Mock
const mockedAnalyze = analyzeModule.analyzeReview as jest.Mock
const mockedGetRepositoryMemberIds = getRepositoryMemberIds as jest.Mock

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
  repoId: "repo-1",
}

describe("POST /api/review/analyze", () => {
  afterEach(() => jest.clearAllMocks())

  it("starts review analysis and returns PENDING", async () => {
    mockedFindUnique.mockResolvedValue(mockPR)
    mockedAnalyze.mockResolvedValue(undefined)
    mockedNotificationCreate.mockResolvedValue({
      id: "notif-1",
      type: "NEW_REVIEW",
      title: "AI review is ready",
      message: "done",
      isRead: false,
      userId: "user-1",
      prId: "pr-1",
      commentId: null,
      createdAt: new Date(),
    })

    const res = await POST(makeRequest({ pullRequestId: "pr-1" }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.status).toBe("PENDING")
    expect(mockedAnalyze).toHaveBeenCalledWith("pr-1")
    expect(mockedGetRepositoryMemberIds).toHaveBeenCalledWith("repo-1")
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
