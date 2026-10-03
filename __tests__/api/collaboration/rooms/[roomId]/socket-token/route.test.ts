import { POST } from "@/app/api/collaboration/rooms/[roomId]/socket-token/route"
import { verifyCollaborationRoomSocketToken } from "@/lib/collaboration/socket-token"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildAccessiblePullRequestWhere } from "@/lib/repository-access"
import { getCollaborationPresence } from "@/lib/socket/presence"

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    collaborationRoom: {
      findFirst: jest.fn(),
    },
    collaborationRoomMember: {
      count: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}))

jest.mock("@/lib/repository-access", () => ({
  buildAccessiblePullRequestWhere: jest.fn(),
}))
jest.mock("@/lib/socket/presence", () => ({ getCollaborationPresence: jest.fn() }))

const mockedAuth = auth as jest.Mock
const mockedTransaction = prisma.$transaction as jest.Mock
const mockedFindRoom = prisma.collaborationRoom.findFirst as jest.Mock
const mockedFindMember = prisma.collaborationRoomMember.findUnique as jest.Mock
const mockedPresence = getCollaborationPresence as jest.Mock
const mockedBuildAccessiblePullRequestWhere =
  buildAccessiblePullRequestWhere as jest.Mock

const sampleRoom = {
  id: "room-1",
  status: "ACTIVE",
  capacity: 2,
}

function createRequest() {
  return new Request(
    "http://localhost/api/collaboration/rooms/room-1/socket-token",
    { method: "POST" }
  )
}

const createParams = (roomId = "room-1") =>
  ({ params: Promise.resolve({ roomId }) }) as {
    params: Promise<{ roomId: string }>
  }

describe("POST /api/collaboration/rooms/[roomId]/socket-token", () => {
  const previousSecret = process.env.SOCKET_INTERNAL_SECRET

  beforeEach(() => {
    process.env.SOCKET_INTERNAL_SECRET = "test-socket-secret"
  })

  afterEach(() => {
    if (previousSecret === undefined) {
      delete process.env.SOCKET_INTERNAL_SECRET
    } else {
      process.env.SOCKET_INTERNAL_SECRET = previousSecret
    }
    jest.clearAllMocks()
  })

  it("returns a room-scoped socket token for an accessible room", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "user-1", name: "Reviewer", email: "reviewer@example.com" },
    })
    mockedBuildAccessiblePullRequestWhere.mockResolvedValue({
      repoId: { in: ["repo-1"] },
    })
    mockedFindRoom.mockResolvedValue(sampleRoom)
    mockedFindMember.mockResolvedValue({ id: "member-1", leftAt: null })
    mockedTransaction.mockImplementation((callback) =>
      callback({
        collaborationRoomMember: {
          upsert: jest.fn().mockResolvedValue({
            id: "member-1",
            user: { id: "user-1", name: "Reviewer", image: null },
          }),
        },
        collaborationRoom: {
          findUniqueOrThrow: jest.fn().mockResolvedValue(sampleRoom),
        },
      })
    )

    const response = await POST(createRequest(), createParams())
    const body = await response.json()
    const payload = verifyCollaborationRoomSocketToken(body.token)

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        typ: "collaboration-room",
        roomId: "room-1",
        memberId: "member-1",
        userId: "user-1",
        userName: "Reviewer",
        capacity: 2,
      })
    )
    expect(body.heartbeatIntervalMs).toBeGreaterThan(0)
    expect(body.reconnectGraceMs).toBeGreaterThan(0)
  })

  it("returns 409 when a new member would exceed room capacity", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-2", name: "Late user" } })
    mockedBuildAccessiblePullRequestWhere.mockResolvedValue({
      repoId: { in: ["repo-1"] },
    })
    mockedFindRoom.mockResolvedValue(sampleRoom)
    mockedFindMember.mockResolvedValue(null)
    mockedPresence.mockResolvedValue({ rooms: [{ roomId: "room-1", users: [{ userId: "user-1" }, { userId: "user-3" }] }] })

    const response = await POST(createRequest(), createParams())
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toBe("Room is full")
  })
})
