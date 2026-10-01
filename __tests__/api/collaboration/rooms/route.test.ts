import { GET, POST } from "@/app/api/collaboration/rooms/route"
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
    collaborationRoom: { findMany: jest.fn() },
    pullRequest: {
      findFirst: jest.fn(),
    },
  },
}))

jest.mock("@/lib/repository-access", () => ({
  buildAccessiblePullRequestWhere: jest.fn(),
}))
jest.mock("@/lib/socket/presence", () => ({ getCollaborationPresence: jest.fn() }))

const mockedAuth = auth as jest.Mock
const mockedTransaction = prisma.$transaction as jest.Mock
const mockedFindPullRequest = prisma.pullRequest.findFirst as jest.Mock
const mockedBuildAccessiblePullRequestWhere =
  buildAccessiblePullRequestWhere as jest.Mock
const mockedFindRooms = prisma.collaborationRoom.findMany as jest.Mock
const mockedPresence = getCollaborationPresence as jest.Mock

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
  members: [
    {
      id: "member-1",
      role: "OWNER",
      userId: "user-1",
      user: { id: "user-1", name: "Owner", image: null },
      joinedAt: now,
      leftAt: null,
    },
  ],
  _count: { messages: 0 },
  endedAt: null,
  createdAt: now,
  updatedAt: now,
}

function createRequest(body: unknown) {
  return new Request("http://localhost/api/collaboration/rooms", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

describe("POST /api/collaboration/rooms", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("returns 401 for anonymous users", async () => {
    mockedAuth.mockResolvedValue(null)

    const response = await POST(createRequest({ pullRequestId: "pr-1" }))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
  })

  it("creates a room with an owner membership for an accessible PR", async () => {
    const createRoom = jest.fn().mockResolvedValue(sampleRoom)

    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessiblePullRequestWhere.mockResolvedValue({
      repoId: { in: ["repo-1"] },
    })
    mockedFindPullRequest.mockResolvedValue({
      id: "pr-1",
      number: 7,
      title: "feat: collaboration",
      repoId: "repo-1",
      repo: { id: "repo-1", name: "codemate", fullName: "phnml1/CodeMate" },
    })
    mockedTransaction.mockImplementation((callback) =>
      callback({
        collaborationRoom: {
          create: createRoom,
        },
      })
    )

    const response = await POST(
      createRequest({ pullRequestId: "pr-1", capacity: 8 })
    )
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.room.id).toBe("room-1")
    expect(body.room.memberCount).toBe(1)
    expect(createRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pullRequestId: "pr-1",
          ownerId: "user-1",
          members: {
            create: {
              userId: "user-1",
              role: "OWNER",
            },
          },
        }),
      })
    )
  })

  it("returns 404 when the PR is not accessible", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessiblePullRequestWhere.mockResolvedValue({ repoId: { in: [] } })
    mockedFindPullRequest.mockResolvedValue(null)

    const response = await POST(createRequest({ pullRequestId: "pr-1" }))
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe("Pull request not found")
  })
})

describe("GET /api/collaboration/rooms", () => {
  beforeEach(() => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessiblePullRequestWhere.mockResolvedValue({ repoId: { in: ["repo-1"] } })
    mockedFindRooms.mockResolvedValue([sampleRoom])
  })

  afterEach(() => jest.clearAllMocks())

  it("hides abandoned active rooms", async () => {
    mockedPresence.mockResolvedValue({ startedAt: now.toISOString(), rooms: [{ roomId: "room-1", users: [] }] })

    const response = await GET(new Request("http://localhost/api/collaboration/rooms?pullRequestId=pr-1"))
    expect(response.status).toBe(200)
    expect((await response.json()).rooms).toEqual([])
  })

  it("shows 1/8 when one of two recorded members has left", async () => {
    mockedFindRooms.mockResolvedValue([{
      ...sampleRoom,
      members: [sampleRoom.members[0], {
        ...sampleRoom.members[0], id: "member-2", userId: "user-2",
        user: { id: "user-2", name: "Reviewer", image: null },
      }],
    }])
    mockedPresence.mockResolvedValue({ startedAt: now.toISOString(), rooms: [{ roomId: "room-1", users: [
      { userId: "user-1", status: "online" },
    ] }] })

    const response = await GET(new Request("http://localhost/api/collaboration/rooms?pullRequestId=pr-1"))
    const { rooms } = await response.json()
    expect(rooms).toHaveLength(1)
    expect(rooms[0].memberCount).toBe(1)
    expect(rooms[0].members.map((member: { userId: string }) => member.userId)).toEqual(["user-1"])
  })

  it("keeps a newly created room visible while its owner connects", async () => {
    mockedFindRooms.mockResolvedValue([{ ...sampleRoom, createdAt: new Date() }])
    mockedPresence.mockResolvedValue({ startedAt: now.toISOString(), rooms: [{ roomId: "room-1", users: [] }] })

    const response = await GET(new Request("http://localhost/api/collaboration/rooms?pullRequestId=pr-1"))
    expect((await response.json()).rooms).toHaveLength(1)
  })
})
