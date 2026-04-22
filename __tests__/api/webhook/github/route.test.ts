import { POST } from "@/app/api/webhook/github/route"
import { prisma } from "@/lib/prisma"
import * as webhookValidator from "@/lib/webhook-validator"
import * as analyzeModule from "@/lib/ai/analyze"
import { getRepositoryMemberIds } from "@/lib/repository-access"
import * as reviewNotificationsModule from "@/lib/review-notifications"
import crypto from "crypto"

const afterQueue: Array<() => Promise<void>> = []

async function flushAfter() {
  for (const fn of afterQueue) await fn()
  afterQueue.length = 0
}

jest.mock("next/server", () => {
  const actual = jest.requireActual("next/server")
  return {
    ...actual,
    after: jest.fn((fn: () => Promise<void>) => {
      afterQueue.push(fn)
    }),
  }
})

jest.mock("@/lib/prisma", () => ({
  prisma: {
    repository: { findFirst: jest.fn() },
    pullRequest: { upsert: jest.fn() },
    notification: { create: jest.fn() },
  },
}))

jest.mock("@/lib/webhook-validator", () => ({
  verifyWebhookSignature: jest.fn(),
}))

jest.mock("@/lib/ai/analyze", () => ({
  analyzeReview: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/lib/socket/emitter", () => ({
  emitNotification: jest.fn(),
}))

jest.mock("@/lib/notification-settings", () => ({
  getEnabledUserIds: jest.fn(async (userIds: string[]) => userIds),
}))

jest.mock("@/lib/repository-access", () => ({
  getRepositoryMemberIds: jest.fn(),
}))

jest.mock("@/lib/review-notifications", () => ({
  upsertReviewNotifications: jest.fn().mockResolvedValue(undefined),
}))

const mockedVerify = webhookValidator.verifyWebhookSignature as jest.Mock
const mockedFindFirst = prisma.repository.findFirst as jest.Mock
const mockedUpsert = prisma.pullRequest.upsert as jest.Mock
const mockedAnalyzeReview = analyzeModule.analyzeReview as jest.Mock
const mockedGetRepositoryMemberIds = getRepositoryMemberIds as jest.Mock
const mockedUpsertReviewNotifications =
  reviewNotificationsModule.upsertReviewNotifications as jest.Mock

function makeSignature(payload: string): string {
  const hmac = crypto.createHmac("sha256", "test-secret")
  hmac.update(payload)
  return "sha256=" + hmac.digest("hex")
}

function createRequest(body: object, event = "pull_request", valid = true) {
  const payload = JSON.stringify(body)
  return new Request("http://localhost/api/webhook/github", {
    method: "POST",
    body: payload,
    headers: {
      "content-type": "application/json",
      "x-hub-signature-256": valid ? makeSignature(payload) : "sha256=invalid",
      "x-github-event": event,
    },
  })
}

const prPayload = {
  action: "opened",
  pull_request: {
    id: 1001,
    number: 42,
    title: "Fix bug",
    body: "description",
    state: "open",
    draft: false,
    merged: false,
    merged_at: null,
    closed_at: null,
    additions: 10,
    deletions: 5,
    changed_files: 3,
    base: { ref: "main" },
    head: { ref: "fix/bug" },
  },
  repository: { id: 99999 },
}

describe("POST /api/webhook/github", () => {
  beforeEach(() => {
    mockedVerify.mockResolvedValue(true)
    mockedFindFirst.mockResolvedValue({ id: "repo-1" })
    mockedUpsert.mockResolvedValue({ id: "pr-1" })
    mockedGetRepositoryMemberIds.mockResolvedValue(["user-1"])
    mockedAnalyzeReview.mockResolvedValue({ status: "COMPLETED" })
    ;(prisma.notification.create as jest.Mock).mockResolvedValue({
      id: "notif-1",
      type: "PR_MERGED",
      title: "PR merged",
      message: null,
      reviewStatus: null,
      isRead: false,
      userId: "user-1",
      prId: "pr-1",
      commentId: null,
      createdAt: new Date(),
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
    afterQueue.length = 0
  })

  it("returns 200 immediately for a valid opened event", async () => {
    const response = await POST(createRequest(prPayload))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.message).toBe("PR processed")
  })

  it("calls analyzeReview inside after()", async () => {
    await POST(createRequest(prPayload))
    await flushAfter()

    expect(mockedAnalyzeReview).toHaveBeenCalledWith("pr-1")
    expect(mockedUpsertReviewNotifications).toHaveBeenCalledWith({
      userIds: ["user-1"],
      prId: "pr-1",
      prTitle: "Fix bug",
      prNumber: 42,
      status: "PENDING",
    })
  })

  it("updates the review notification to COMPLETED after successful analysis", async () => {
    await POST(createRequest(prPayload))
    await flushAfter()

    expect(mockedUpsertReviewNotifications).toHaveBeenNthCalledWith(2, {
      userIds: ["user-1"],
      prId: "pr-1",
      prTitle: "Fix bug",
      prNumber: 42,
      status: "COMPLETED",
    })
  })

  it("updates the review notification to FAILED when analysis fails", async () => {
    mockedAnalyzeReview.mockResolvedValueOnce({ status: "FAILED" })

    const response = await POST(createRequest(prPayload))
    await flushAfter()

    expect(response.status).toBe(200)
    expect(mockedUpsertReviewNotifications).toHaveBeenNthCalledWith(2, {
      userIds: ["user-1"],
      prId: "pr-1",
      prTitle: "Fix bug",
      prNumber: 42,
      status: "FAILED",
    })
  })

  it("returns 401 for invalid signatures", async () => {
    mockedVerify.mockResolvedValue(false)

    const response = await POST(createRequest(prPayload, "pull_request", false))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Invalid webhook signature")
  })

  it("ignores non pull_request events", async () => {
    const response = await POST(createRequest({ zen: "Keep it simple" }, "ping"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.message).toBe("Event ignored")
    expect(mockedUpsert).not.toHaveBeenCalled()
  })

  it("ignores unsupported pull_request actions", async () => {
    const response = await POST(createRequest({ ...prPayload, action: "labeled" }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.message).toBe("Action ignored")
    expect(mockedUpsert).not.toHaveBeenCalled()
  })

  it("creates PR_MERGED notifications for closed actions", async () => {
    const closedPayload = {
      ...prPayload,
      action: "closed",
      pull_request: { ...prPayload.pull_request, state: "closed", merged: false },
    }

    const response = await POST(createRequest(closedPayload))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.message).toBe("PR status processed")
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "PR_MERGED", userId: "user-1" }),
      })
    )
  })

  it("returns 404 when the repository is not connected", async () => {
    mockedFindFirst.mockResolvedValue(null)

    const response = await POST(createRequest(prPayload))
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe("Repository not found")
  })

  it("stores draft PRs with DRAFT status", async () => {
    const draftPayload = {
      ...prPayload,
      pull_request: { ...prPayload.pull_request, draft: true },
    }

    await POST(createRequest(draftPayload))

    expect(mockedUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: "DRAFT" }),
      })
    )
  })

  it("returns 500 on unexpected errors", async () => {
    mockedVerify.mockRejectedValue(new Error("unexpected"))

    const response = await POST(createRequest(prPayload))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe("Internal server error")
  })
})
