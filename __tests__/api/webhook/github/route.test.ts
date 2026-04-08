import { POST } from "@/app/api/webhook/github/route"
import { prisma } from "@/lib/prisma"
import * as webhookValidator from "@/lib/webhook-validator"
import * as analyzeModule from "@/lib/ai/analyze"
import * as emitterModule from "@/lib/socket/emitter"
import crypto from "crypto"

// after()는 콜백을 큐에 저장 → flushAfter()로 수동 실행
// POST가 after() 완료를 기다리지 않으므로 직접 flush해야 비동기 결과 검증 가능
const afterQueue: Array<() => Promise<void>> = []
async function flushAfter() {
  for (const fn of afterQueue) await fn()
  afterQueue.length = 0
}

jest.mock("next/server", () => {
  const actual = jest.requireActual("next/server")
  return {
    ...actual,
    after: jest.fn((fn: () => Promise<void>) => { afterQueue.push(fn) }),
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
  isNotificationEnabled: jest.fn().mockResolvedValue(true),
}))

const mockedVerify = webhookValidator.verifyWebhookSignature as jest.Mock
const mockedFindFirst = prisma.repository.findFirst as jest.Mock
const mockedUpsert = prisma.pullRequest.upsert as jest.Mock
const mockedAnalyzeReview = analyzeModule.analyzeReview as jest.Mock
const mockedEmitNotification = emitterModule.emitNotification as jest.Mock

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
    mockedFindFirst.mockResolvedValue({ id: "repo-1", userId: "user-1" })
    mockedUpsert.mockResolvedValue({ id: "pr-1" })
    ;(prisma.notification.create as jest.Mock).mockResolvedValue({
      id: "notif-1",
      type: "NEW_REVIEW",
      title: "AI 코드 리뷰가 완료되었습니다",
      message: null,
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

  it("유효한 PR opened 이벤트에 200으로 즉시 응답한다", async () => {
    const response = await POST(createRequest(prPayload))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.message).toBe("PR processed")
  })

  it("after() 안에서 analyzeReview를 호출한다 (PENDING 생성은 analyzeReview 내부 책임)", async () => {
    await POST(createRequest(prPayload))
    await flushAfter()

    expect(mockedAnalyzeReview).toHaveBeenCalledWith("pr-1")
    // webhook이 직접 review.create를 호출하지 않음
    expect(prisma.notification.create).toHaveBeenCalledTimes(1) // NEW_REVIEW 알림만
  })

  it("analyzeReview 성공 시 NEW_REVIEW 알림을 발송한다", async () => {
    await POST(createRequest(prPayload))
    await flushAfter()

    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "NEW_REVIEW", userId: "user-1", prId: "pr-1" }),
      })
    )
    expect(mockedEmitNotification).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ type: "NEW_REVIEW" })
    )
  })

  it("analyzeReview 실패 시 REVIEW_FAILED 알림을 발송한다", async () => {
    mockedAnalyzeReview.mockRejectedValueOnce(new Error("Claude timeout"))
    ;(prisma.notification.create as jest.Mock).mockResolvedValue({
      id: "notif-fail",
      type: "REVIEW_FAILED",
      title: "AI 코드 리뷰에 실패했습니다",
      message: null,
      isRead: false,
      userId: "user-1",
      prId: "pr-1",
      commentId: null,
      createdAt: new Date(),
    })

    const response = await POST(createRequest(prPayload))
    await flushAfter()

    // 분석 실패여도 webhook 응답은 200
    expect(response.status).toBe(200)
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "REVIEW_FAILED", userId: "user-1" }),
      })
    )
    expect(mockedEmitNotification).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ type: "REVIEW_FAILED" })
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
    const response = await POST(createRequest({ zen: "Keep it simple" }, "ping"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.message).toBe("Event ignored")
    expect(mockedUpsert).not.toHaveBeenCalled()
  })

  it("opened/synchronize/closed 외 action은 무시한다", async () => {
    const response = await POST(createRequest({ ...prPayload, action: "labeled" }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.message).toBe("Action ignored")
    expect(mockedUpsert).not.toHaveBeenCalled()
  })

  it("closed action은 PR 상태 변경을 처리하고 PR_MERGED 알림을 생성한다", async () => {
    ;(prisma.notification.create as jest.Mock).mockResolvedValue({
      id: "notif-1",
      type: "PR_MERGED",
      title: "PR이 닫혔습니다",
      message: null,
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
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "PR_MERGED" }),
      })
    )
  })

  it("연동되지 않은 Repository의 이벤트는 404를 반환한다", async () => {
    mockedFindFirst.mockResolvedValue(null)

    const response = await POST(createRequest(prPayload))
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe("Repository not found")
  })

  it("draft PR은 DRAFT 상태로 저장한다", async () => {
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
