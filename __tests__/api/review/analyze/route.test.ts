import { POST } from "@/app/api/review/analyze/route"
import { after } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import * as analyzeModule from "@/lib/ai/analyze"
import { invalidateDashboardForUsers } from "@/lib/dashboard-cache"
import {
  buildAccessiblePullRequestWhere,
  getRepositoryMemberIds,
} from "@/lib/repository-access"
import * as reviewNotificationsModule from "@/lib/review-notifications"

jest.mock("next/server", () => ({
  ...jest.requireActual("next/server"),
  after: jest.fn(),
}))

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    pullRequest: { findFirst: jest.fn() },
  },
}))

jest.mock("@/lib/ai/analyze", () => ({
  analyzeReview: jest.fn(),
}))

jest.mock("@/lib/dashboard-cache", () => ({
  invalidateDashboardForUsers: jest.fn(),
}))

jest.mock("@/lib/socket/emitter", () => ({
  emitNotification: jest.fn(),
}))

jest.mock("@/lib/notification-settings", () => ({
  getEnabledUserIds: jest.fn().mockResolvedValue(["user-1"]),
}))

jest.mock("@/lib/repository-access", () => ({
  buildAccessiblePullRequestWhere: jest.fn(),
  getRepositoryMemberIds: jest.fn().mockResolvedValue(["user-1"]),
}))

jest.mock("@/lib/review-notifications", () => ({
  upsertReviewNotifications: jest.fn().mockResolvedValue(undefined),
}))

const mockedAfter = after as jest.Mock
const mockedAuth = auth as jest.Mock
const mockedFindFirst = prisma.pullRequest.findFirst as jest.Mock
const mockedAnalyze = analyzeModule.analyzeReview as jest.Mock
const mockedBuildAccessiblePullRequestWhere =
  buildAccessiblePullRequestWhere as jest.Mock
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
  beforeEach(() => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessiblePullRequestWhere.mockResolvedValue({
      repoId: { in: ["repo-1"] },
    })
    mockedGetRepositoryMemberIds.mockResolvedValue(["user-1"])
    mockedUpsertReviewNotifications.mockResolvedValue(undefined)
  })

  afterEach(() => jest.clearAllMocks())

  it("schedules authorized review analysis after the response", async () => {
    mockedFindFirst.mockResolvedValue(mockPR)
    mockedAnalyze.mockResolvedValue({ status: "COMPLETED" })

    const res = await POST(makeRequest({ pullRequestId: "pr-1" }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.status).toBe("PENDING")
    expect(mockedBuildAccessiblePullRequestWhere).toHaveBeenCalledWith("user-1")
    expect(mockedFindFirst).toHaveBeenCalledWith({
      where: { id: "pr-1", repoId: { in: ["repo-1"] } },
      select: { id: true, title: true, number: true, repoId: true },
    })
    expect(mockedAfter).toHaveBeenCalledTimes(1)
    expect(mockedAnalyze).not.toHaveBeenCalled()

    await mockedAfter.mock.calls[0][0]()

    expect(mockedAnalyze).toHaveBeenCalledWith("pr-1")
    expect(invalidateDashboardForUsers).toHaveBeenCalledWith(["user-1"])
    expect(mockedGetRepositoryMemberIds).toHaveBeenCalledWith("repo-1")
    expect(mockedUpsertReviewNotifications).toHaveBeenCalledWith({
      userIds: ["user-1"],
      prId: "pr-1",
      prTitle: "Fix bug",
      prNumber: 42,
      status: "PENDING",
    })
    expect(mockedUpsertReviewNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ status: "COMPLETED" })
    )
  })

  it("returns 401 before reading the request for anonymous users", async () => {
    mockedAuth.mockResolvedValue(null)

    const res = await POST(makeRequest({ pullRequestId: "pr-1" }))

    expect(res.status).toBe(401)
    expect(mockedBuildAccessiblePullRequestWhere).not.toHaveBeenCalled()
    expect(mockedAfter).not.toHaveBeenCalled()
    expect(invalidateDashboardForUsers).not.toHaveBeenCalled()
  })

  it("returns 400 when pullRequestId is missing", async () => {
    const res = await POST(makeRequest({}))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe("pullRequestId is required")
    expect(mockedAnalyze).not.toHaveBeenCalled()
  })

  it("returns 400 for invalid JSON and non-string PR IDs", async () => {
    const invalidJson = new Request("http://localhost/api/review/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    })

    expect((await POST(invalidJson)).status).toBe(400)
    expect((await POST(makeRequest({ pullRequestId: 42 }))).status).toBe(400)
    expect(mockedFindFirst).not.toHaveBeenCalled()
    expect(mockedAfter).not.toHaveBeenCalled()
  })

  it("returns 404 when the pull request does not exist", async () => {
    mockedFindFirst.mockResolvedValue(null)

    const res = await POST(makeRequest({ pullRequestId: "not-exist" }))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBe("Pull request not found")
    expect(mockedAfter).not.toHaveBeenCalled()
  })

  it("does not schedule analysis for a PR outside the user's repositories", async () => {
    mockedFindFirst.mockResolvedValue(null)

    const res = await POST(makeRequest({ pullRequestId: "other-user-pr" }))

    expect(res.status).toBe(404)
    expect(mockedFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "other-user-pr", repoId: { in: ["repo-1"] } },
      })
    )
    expect(mockedAnalyze).not.toHaveBeenCalled()
    expect(mockedAfter).not.toHaveBeenCalled()
  })

  it("returns 500 on unexpected errors", async () => {
    mockedFindFirst.mockRejectedValue(new Error("DB error"))

    const res = await POST(makeRequest({ pullRequestId: "pr-1" }))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe("Internal server error")
  })
})
