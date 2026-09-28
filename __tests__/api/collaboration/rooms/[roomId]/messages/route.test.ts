import { POST } from "@/app/api/collaboration/rooms/[roomId]/messages/route"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildAccessiblePullRequestWhere } from "@/lib/repository-access"

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

const mockedAuth = auth as jest.Mock
const mockedFindRoom = prisma.collaborationRoom.findFirst as jest.Mock
const mockedFindMember = prisma.collaborationRoomMember.findUnique as jest.Mock
const mockedCreateMessage = prisma.collaborationMessage.create as jest.Mock
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
  afterEach(() => {
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
    mockedCreateMessage.mockResolvedValue({
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
    })

    const response = await POST(
      createRequest({
        content: "이 줄 같이 볼까요?",
        clientMessageId: "client-1",
        codeReference: {
          filePath: "app/page.tsx",
          side: "RIGHT",
          startLine: 10,
          endLine: 12,
        },
      }),
      createParams()
    )
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.message.id).toBe("message-1")
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
            }),
          },
        }),
      })
    )
  })
})
