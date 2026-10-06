import { POST } from "@/app/api/internal/collaboration/reconcile/route"
import { prisma } from "@/lib/prisma"
import { CollaborationPresenceUnavailableError, getCollaborationPresence } from "@/lib/socket/presence"

jest.mock("@/lib/prisma", () => ({
  prisma: { collaborationRoomMember: { findMany: jest.fn(), updateMany: jest.fn() } },
}))
jest.mock("@/lib/socket/presence", () => ({
  ...jest.requireActual("@/lib/socket/presence"),
  getCollaborationPresence: jest.fn(),
}))

const findMany = prisma.collaborationRoomMember.findMany as jest.Mock
const updateMany = prisma.collaborationRoomMember.updateMany as jest.Mock
const presence = getCollaborationPresence as jest.Mock
const request = (secret: string) => new Request("http://localhost/api/internal/collaboration/reconcile", {
  method: "POST",
  headers: { "x-socket-secret": secret, "x-collaboration-scope": "local" },
})

describe("POST /api/internal/collaboration/reconcile", () => {
  const previousSecret = process.env.SOCKET_INTERNAL_SECRET
  const previousScope = process.env.COLLABORATION_PRESENCE_SCOPE

  beforeEach(() => {
    process.env.SOCKET_INTERNAL_SECRET = "test-secret"
    process.env.COLLABORATION_PRESENCE_SCOPE = "local"
    updateMany.mockResolvedValue({ count: 1 })
  })

  afterEach(() => {
    if (previousSecret === undefined) delete process.env.SOCKET_INTERNAL_SECRET
    else process.env.SOCKET_INTERNAL_SECRET = previousSecret
    if (previousScope === undefined) delete process.env.COLLABORATION_PRESENCE_SCOPE
    else process.env.COLLABORATION_PRESENCE_SCOPE = previousScope
    jest.clearAllMocks()
  })

  it("rejects requests without the internal secret", async () => {
    expect((await POST(request("wrong"))).status).toBe(401)
    expect(findMany).not.toHaveBeenCalled()
  })

  it("marks only absent, unchanged memberships as left", async () => {
    const updatedAt = new Date("2026-01-01T00:00:00.000Z")
    findMany.mockResolvedValue([
      { id: "member-1", roomId: "room-1", userId: "user-1", updatedAt },
      { id: "member-2", roomId: "room-1", userId: "user-2", updatedAt },
    ])
    presence.mockResolvedValue({ rooms: [{ roomId: "room-1", users: [{ userId: "user-1" }] }] })

    const response = await POST(request("test-secret"))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ reconciled: 1 })
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { leftAt: null, updatedAt: { lte: expect.any(Date) }, room: { status: "ACTIVE", presenceScope: "local" } },
    }))
    expect(updateMany).toHaveBeenCalledTimes(1)
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "member-2", roomId: "room-1", userId: "user-2", leftAt: null, updatedAt, room: { presenceScope: "local" } },
      data: { leftAt: expect.any(Date) },
    })
  })

  it("does not change DB membership if Redis presence is unavailable", async () => {
    findMany.mockResolvedValue([{ id: "member-1", roomId: "room-1", userId: "user-1", updatedAt: new Date(0) }])
    presence.mockRejectedValue(new CollaborationPresenceUnavailableError())

    expect((await POST(request("test-secret"))).status).toBe(503)
    expect(updateMany).not.toHaveBeenCalled()
  })

  it("rejects a different environment before querying or writing the shared database", async () => {
    process.env.COLLABORATION_PRESENCE_SCOPE = "production"
    expect((await POST(request("test-secret"))).status).toBe(409)
    expect(findMany).not.toHaveBeenCalled()
    expect(updateMany).not.toHaveBeenCalled()
  })

  it("does not reconcile local members from a production Redis with no local room", async () => {
    process.env.COLLABORATION_PRESENCE_SCOPE = "production"
    const localMember = { id: "member-local", roomId: "local-room", userId: "user-1", updatedAt: new Date(0) }
    findMany.mockImplementation(async ({ where }) => where.room.presenceScope === "production" ? [] : [localMember])
    presence.mockResolvedValue({ rooms: [{ roomId: "local-room", users: [] }] })
    const response = await POST(new Request("http://localhost/api/internal/collaboration/reconcile", {
      method: "POST", headers: { "x-socket-secret": "test-secret", "x-collaboration-scope": "production" },
    }))
    expect(await response.json()).toEqual({ reconciled: 0 })
    expect(presence).not.toHaveBeenCalled()
    expect(updateMany).not.toHaveBeenCalled()
  })
})
