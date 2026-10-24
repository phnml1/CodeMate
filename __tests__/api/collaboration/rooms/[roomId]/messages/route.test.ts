import { POST } from "@/app/api/collaboration/rooms/[roomId]/messages/route"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildAccessiblePullRequestWhere } from "@/lib/repository-access"
import { emitCollaborationMessage } from "@/lib/socket/emitter"
import { checkCollaborationMessageRateLimit, CollaborationMessageRateLimitUnavailableError } from "@/lib/socket/message-rate-limit"

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    collaborationRoom: {
      findFirst: jest.fn(),
    },
    collaborationRoomMember: {
      findUnique: jest.fn(),
    },
    collaborationMessage: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}))

jest.mock("@/lib/repository-access", () => ({
  buildAccessiblePullRequestWhere: jest.fn(),
}))

jest.mock("@/lib/socket/emitter", () => ({
  emitCollaborationMessage: jest.fn(),
}))

jest.mock("@/lib/socket/message-rate-limit", () => ({
  ...jest.requireActual("@/lib/socket/message-rate-limit"),
  checkCollaborationMessageRateLimit: jest.fn(),
}))

const mockedAuth = auth as jest.Mock
const mockedFindRoom = prisma.collaborationRoom.findFirst as jest.Mock
const mockedFindMember = prisma.collaborationRoomMember.findUnique as jest.Mock
const mockedCreateMessage = prisma.collaborationMessage.create as jest.Mock
const mockedEmitMessage = emitCollaborationMessage as jest.Mock
const mockedRateLimit = checkCollaborationMessageRateLimit as jest.Mock
const mockedBuildAccessiblePullRequestWhere =
  buildAccessiblePullRequestWhere as jest.Mock

const now = new Date("2026-09-28T00:00:00.000Z")

const sampleRoom = {
  id: "room-1",
  name: "PR #7 협업방",
  status: "ACTIVE",
  capacity: 8,
  pullRequestId: "pr-1",
  ownerId: "user-1",
  owner: { id: "user-1", name: "Owner", image: null },
  pullRequest: {
    id: "pr-1",
    number: 7,
    title: "feat: collaboration",
    repoId: "repo-1",
    repo: { id: "repo-1", name: "codemate", fullName: "phnml1/CodeMate" },
  },
  members: [],
  _count: { messages: 0 },
  endedAt: null,
  createdAt: now,
  updatedAt: now,
}

const sampleMessage = {
  id: "message-1",
  roomId: "room-1",
  authorId: "user-2",
  author: { id: "user-2", name: "Reviewer", image: null },
  content: "이 줄 같이 볼까요?",
  clientMessageId: "client-1",
  codeReference: {
    id: "code-ref-1",
    filePath: "app/page.tsx",
    side: "RIGHT",
    startLine: 10,
    endLine: 12,
    startColumn: null,
    endColumn: null,
    baseSha: null,
    headSha: null,
    selectedText: null,
    messageId: "message-1",
    createdAt: now,
  },
  createdAt: now,
  updatedAt: now,
}

function createRequest(body: unknown) {
  return new Request(
    "http://localhost/api/collaboration/rooms/room-1/messages",
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  )
}

const createParams = (roomId = "room-1") =>
  ({ params: Promise.resolve({ roomId }) }) as {
    params: Promise<{ roomId: string }>
  }

describe("POST /api/collaboration/rooms/[roomId]/messages", () => {
  const previousPerfLogs = process.env.COLLABORATION_PERF_LOGS

  beforeEach(() => {
    delete process.env.COLLABORATION_PERF_LOGS
    mockedEmitMessage.mockResolvedValue(undefined)
    mockedRateLimit.mockResolvedValue({ allowed: true, retryAfterMs: 0 })
  })

  afterEach(() => {
    if (previousPerfLogs === undefined) delete process.env.COLLABORATION_PERF_LOGS
    else process.env.COLLABORATION_PERF_LOGS = previousPerfLogs
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  it("returns 403 when the user has not joined the room", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-2" } })
    mockedBuildAccessiblePullRequestWhere.mockResolvedValue({
      repoId: { in: ["repo-1"] },
    })
    mockedFindRoom.mockResolvedValue(sampleRoom)
    mockedFindMember.mockResolvedValue(null)

    const response = await POST(
      createRequest({ content: "hello" }),
      createParams()
    )
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe("Join room before sending messages")
  })

  it("creates a message with an optional code reference", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-2" } })
    mockedBuildAccessiblePullRequestWhere.mockResolvedValue({
      repoId: { in: ["repo-1"] },
    })
    mockedFindRoom.mockResolvedValue(sampleRoom)
    mockedFindMember.mockResolvedValue({ id: "member-2", leftAt: null })
    mockedCreateMessage.mockResolvedValue(sampleMessage)

    const response = await POST(
      createRequest({
        content: "이 줄 같이 볼까요?",
        clientMessageId: "client-1",
        codeReference: {
          filePath: "app/page.tsx",
          side: "RIGHT",
          startLine: 10,
          endLine: 12,
          baseSha: "a".repeat(40),
          headSha: "b".repeat(40),
        },
      }),
      createParams()
    )
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(mockedRateLimit).toHaveBeenCalledWith("room-1", "user-2", "client-1")
    expect(response.headers.has("Server-Timing")).toBe(false)
    expect(body.message.id).toBe("message-1")
    expect(mockedEmitMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "message-1",
        roomId: "room-1",
        content: "이 줄 같이 볼까요?",
      })
    )
    expect(mockedCreateMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          roomId: "room-1",
          authorId: "user-2",
          clientMessageId: "client-1",
          codeReference: {
            create: expect.objectContaining({
              filePath: "app/page.tsx",
              startLine: 10,
              endLine: 12,
              baseSha: "a".repeat(40),
              headSha: "b".repeat(40),
            }),
          },
          reviewComment: {
            create: {
              pullRequestId: "pr-1",
              authorId: "user-2",
              content: "이 줄 같이 볼까요?",
              mentions: [],
              reactions: {},
            },
          },
        }),
      })
    )
  })

  it("does not create a PR review for a room-wide chat message", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-2" } })
    mockedBuildAccessiblePullRequestWhere.mockResolvedValue({ repoId: { in: ["repo-1"] } })
    mockedFindRoom.mockResolvedValue(sampleRoom)
    mockedFindMember.mockResolvedValue({ id: "member-2", leftAt: null })
    mockedCreateMessage.mockResolvedValue({ ...sampleMessage, codeReference: null })

    const response = await POST(createRequest({ content: "일반 대화" }), createParams())

    expect(response.status).toBe(201)
    expect(mockedCreateMessage.mock.calls.at(-1)?.[0].data).not.toHaveProperty("reviewComment")
  })

  it("rejects a limited user before writing or broadcasting", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-2" } })
    mockedBuildAccessiblePullRequestWhere.mockResolvedValue({ repoId: { in: ["repo-1"] } })
    mockedFindRoom.mockResolvedValue(sampleRoom)
    mockedFindMember.mockResolvedValue({ id: "member-2", leftAt: null })
    mockedRateLimit.mockResolvedValue({ allowed: false, retryAfterMs: 1250 })

    const response = await POST(createRequest({ content: "hello", clientMessageId: "client-2" }), createParams())

    expect(response.status).toBe(429)
    expect(response.headers.get("Retry-After")).toBe("2")
    expect(mockedCreateMessage).not.toHaveBeenCalled()
    expect(mockedEmitMessage).not.toHaveBeenCalled()
  })

  it("fails closed when the rate limiter is unavailable", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-2" } })
    mockedBuildAccessiblePullRequestWhere.mockResolvedValue({ repoId: { in: ["repo-1"] } })
    mockedFindRoom.mockResolvedValue(sampleRoom)
    mockedFindMember.mockResolvedValue({ id: "member-2", leftAt: null })
    mockedRateLimit.mockRejectedValue(new CollaborationMessageRateLimitUnavailableError())

    const response = await POST(createRequest({ content: "hello" }), createParams())

    expect(response.status).toBe(503)
    expect(mockedCreateMessage).not.toHaveBeenCalled()
    expect(mockedEmitMessage).not.toHaveBeenCalled()
  })

  it("keeps the saved message when socket broadcast fails", async () => {
    process.env.COLLABORATION_PERF_LOGS = "1"
    const log = jest.spyOn(console, "info").mockImplementation(() => {})
    mockedAuth.mockResolvedValue({ user: { id: "user-2" } })
    mockedBuildAccessiblePullRequestWhere.mockResolvedValue({
      repoId: { in: ["repo-1"] },
    })
    mockedFindRoom.mockResolvedValue(sampleRoom)
    mockedFindMember.mockResolvedValue({ id: "member-2", leftAt: null })
    mockedCreateMessage.mockResolvedValue(sampleMessage)
    mockedEmitMessage.mockRejectedValueOnce(new Error("Socket unavailable"))
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {})

    try {
      const response = await POST(
        createRequest({ content: sampleMessage.content }),
        createParams()
      )

      expect(response.status).toBe(201)
      expect((await response.json()).message.id).toBe("message-1")
      expect(consoleSpy).toHaveBeenCalled()
      expect(JSON.parse(log.mock.calls[0][0]).outcome).toBe("201:socket_emit_failed")
    } finally {
      consoleSpy.mockRestore()
    }
  })

  it("reports POST phases without logging message content when enabled", async () => {
    process.env.COLLABORATION_PERF_LOGS = "1"
    const log = jest.spyOn(console, "info").mockImplementation(() => {})
    mockedAuth.mockResolvedValue({ user: { id: "user-2" } })
    mockedBuildAccessiblePullRequestWhere.mockImplementation(async (
      _userId,
      _repositoryId,
      onMembershipTableChecked
    ) => {
      onMembershipTableChecked?.()
      return { repoId: { in: ["repo-1"] } }
    })
    mockedFindRoom.mockResolvedValue(sampleRoom)
    mockedFindMember.mockResolvedValue({ id: "member-2", leftAt: null })
    mockedCreateMessage.mockResolvedValue(sampleMessage)

    const response = await POST(
      createRequest({ content: sampleMessage.content, clientMessageId: "client-1" }),
      createParams()
    )
    const timing = response.headers.get("Server-Timing")

    expect(response.status).toBe(201)
    expect(timing).toContain("auth;dur=")
    expect(timing).toContain("membershipTable;dur=")
    expect(timing).toContain("repoMembership;dur=")
    expect(timing).toContain("roomQuery;dur=")
    expect(timing).toContain("roomLookupTotal;dur=")
    expect(timing).toContain("memberLookup;dur=")
    expect(timing).toContain("dbCreate;dur=")
    expect(timing).toContain("socketEmit;dur=")
    expect(log).toHaveBeenCalledTimes(1)
    const event = JSON.parse(log.mock.calls[0][0])
    expect(event).toEqual(expect.objectContaining({
      event: "collaboration.message.post",
      outcome: "201",
      roomId: "room-1",
      messageId: "message-1",
    }))
    expect(JSON.stringify(event)).not.toContain(sampleMessage.content)
  })
})
