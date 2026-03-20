import { POST } from "@/app/api/webhook/github/route"
import { prisma } from "@/lib/prisma"
import * as webhookValidator from "@/lib/webhook-validator"
import crypto from "crypto"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    repository: {
      findFirst: jest.fn(),
    },
    pullRequest: {
      upsert: jest.fn(),
    },
    review: {
      create: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
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
  isNotificationEnabled: jest.fn().mockResolvedValue(true),
}))

const mockedVerify = webhookValidator.verifyWebhookSignature as jest.Mock
const mockedFindFirst = prisma.repository.findFirst as jest.Mock
const mockedUpsert = prisma.pullRequest.upsert as jest.Mock

const SECRET = "test-secret"

function makeSignature(payload: string): string {
  const hmac = crypto.createHmac("sha256", SECRET)
  hmac.update(payload)
  return "sha256=" + hmac.digest("hex")
}

function createRequest(body: object, event = "pull_request", valid = true) {
  const payload = JSON.stringify(body)
  const signature = valid ? makeSignature(payload) : "sha256=invalid"
  return new Request("http://localhost/api/webhook/github", {
    method: "POST",
    body: payload,
    headers: {
      "content-type": "application/json",
      "x-hub-signature-256": signature,
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
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("유효한 서명과 PR opened 이벤트를 처리한다", async () => {
    mockedVerify.mockResolvedValue(true)
    mockedFindFirst.mockResolvedValue({ id: "repo-1", userId: "user-1" })
    mockedUpsert.mockResolvedValue({ id: "pr-1" })
    ;(prisma.review.create as jest.Mock).mockResolvedValue({ id: "review-1" })
    ;(prisma.notification.create as jest.Mock).mockResolvedValue({
      id: "notif-1",
      type: "NEW_REVIEW",
      createdAt: new Date(),
    })

    const response = await POST(createRequest(prPayload))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.message).toBe("PR processed")
    expect(mockedUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { githubId: BigInt(1001) },
        create: expect.objectContaining({ number: 42, title: "Fix bug", status: "OPEN" }),
      })
    )
    expect(prisma.review.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pullRequestId: "pr-1", status: "PENDING" }),
      })
    )
  })

  it("잘못된 서명이면 401을 반환한다", async () => {
    mockedVerify.mockResolvedValue(false)

    const response = await POST(createRequest(prPayload, "pull_request", false))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Invalid webhook signature")
  })

  it("pull_request 외 이벤트는 200으로 무시한다", async () => {
    mockedVerify.mockResolvedValue(true)

    const response = await POST(createRequest({ zen: "Keep it simple" }, "ping"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.message).toBe("Event ignored")
    expect(mockedUpsert).not.toHaveBeenCalled()
  })

  it("opened/synchronize/closed 외 action은 무시한다", async () => {
    mockedVerify.mockResolvedValue(true)

    const response = await POST(
      createRequest({ ...prPayload, action: "labeled" })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.message).toBe("Action ignored")
    expect(mockedUpsert).not.toHaveBeenCalled()
  })

  it("closed action은 PR 상태 변경을 처리하고 알림을 생성한다", async () => {
    mockedVerify.mockResolvedValue(true)
    mockedFindFirst.mockResolvedValue({ id: "repo-1", userId: "user-1" })
    mockedUpsert.mockResolvedValue({ id: "pr-1" })
    ;(prisma.notification.create as jest.Mock).mockResolvedValue({
      id: "notif-1",
      type: "PR_MERGED",
      title: "PR이 닫혔습니다",
      message: "...",
      isRead: false,
      userId: "user-1",
      prId: "pr-1",
      commentId: null,
      createdAt: new Date(),
    })

    const closedPayload = {
      ...prPayload,
      action: "closed",
      pull_request: { ...prPayload.pull_request, state: "closed", merged: false },
    }

    const response = await POST(createRequest(closedPayload))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.message).toBe("PR status processed")
  })

  it("연동되지 않은 Repository의 이벤트는 404를 반환한다", async () => {
    mockedVerify.mockResolvedValue(true)
    mockedFindFirst.mockResolvedValue(null)

    const response = await POST(createRequest(prPayload))
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe("Repository not found")
  })

  it("draft PR은 DRAFT 상태로 저장한다", async () => {
    mockedVerify.mockResolvedValue(true)
    mockedFindFirst.mockResolvedValue({ id: "repo-1", userId: "user-1" })
    mockedUpsert.mockResolvedValue({})
    ;(prisma.review.create as jest.Mock).mockResolvedValue({ id: "review-1" })

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

  it("서버 에러 시 500을 반환한다", async () => {
    mockedVerify.mockRejectedValue(new Error("unexpected"))

    const response = await POST(createRequest(prPayload))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe("Internal server error")
  })
})
