import { POST } from "@/app/api/collaboration/rooms/[roomId]/leave/route"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/prisma", () => ({ prisma: { collaborationRoomMember: { findFirst: jest.fn(), updateMany: jest.fn() } } }))

const params = { params: Promise.resolve({ roomId: "room-1" }) }
const request = (socketId: unknown) => new Request("http://localhost/api/collaboration/rooms/room-1/leave", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ socketId }),
})

describe("POST /api/collaboration/rooms/[roomId]/leave", () => {
  const originalSecret = process.env.SOCKET_INTERNAL_SECRET
  const originalScope = process.env.COLLABORATION_PRESENCE_SCOPE
  const originalFetch = global.fetch

  beforeEach(() => {
    process.env.SOCKET_INTERNAL_SECRET = "test-secret"
    process.env.COLLABORATION_PRESENCE_SCOPE = "local"
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } })
    ;(prisma.collaborationRoomMember.findFirst as jest.Mock).mockResolvedValue({
      id: "member-1", updatedAt: new Date("2026-10-04T00:00:00.000Z"),
    })
    ;(prisma.collaborationRoomMember.updateMany as jest.Mock).mockResolvedValue({ count: 1 })
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ presenceScope: "local", presence: { roomId: "room-1", users: [] } }),
    })
  })

  afterEach(() => {
    global.fetch = originalFetch
    if (originalSecret === undefined) delete process.env.SOCKET_INTERNAL_SECRET
    else process.env.SOCKET_INTERNAL_SECRET = originalSecret
    if (originalScope === undefined) delete process.env.COLLABORATION_PRESENCE_SCOPE
    else process.env.COLLABORATION_PRESENCE_SCOPE = originalScope
    jest.clearAllMocks()
  })

  it("forwards only the authenticated user's socket leave to the internal server", async () => {
    const response = await POST(request("socket-1"), params)
    expect(response.status).toBe(204)
    expect(global.fetch).toHaveBeenCalledWith(new URL("http://localhost:4000/internal/collaboration/leave"), expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ roomId: "room-1", userId: "user-1", socketId: "socket-1" }),
    }))
    expect(prisma.collaborationRoomMember.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: "member-1", roomId: "room-1", userId: "user-1", leftAt: null,
        updatedAt: new Date("2026-10-04T00:00:00.000Z"),
        room: { presenceScope: "local" },
      },
    }))
  })

  it("keeps membership when another socket of the same user is still present", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ presenceScope: "local", presence: { roomId: "room-1", users: [{ userId: "user-1" }] } }),
    })
    expect((await POST(request("socket-1"), params)).status).toBe(204)
    expect(prisma.collaborationRoomMember.updateMany).not.toHaveBeenCalled()
  })

  it("does not close a membership refreshed by rejoining during a delayed leave", async () => {
    const oldVersion = new Date("2026-10-04T00:00:00.000Z")
    const newVersion = new Date("2026-10-05T00:00:00.000Z")
    let membershipVersion = oldVersion
    let leftAt: Date | null = null
    let finishLeave!: (response: unknown) => void
    let forwarded!: () => void
    const started = new Promise<void>((resolve) => { forwarded = resolve })
    global.fetch = jest.fn().mockImplementation(() => {
      forwarded()
      return new Promise((resolve) => { finishLeave = resolve })
    })
    ;(prisma.collaborationRoomMember.updateMany as jest.Mock).mockImplementation(async ({ where, data }) => {
      if (where.updatedAt.getTime() !== membershipVersion.getTime()) return { count: 0 }
      leftAt = data.leftAt
      return { count: 1 }
    })

    const leave = POST(request("old-socket"), params)
    await started
    membershipVersion = newVersion
    finishLeave({ ok: true, json: async () => ({ presenceScope: "local", presence: { roomId: "room-1", users: [] } }) })
    expect((await leave).status).toBe(204)
    expect(prisma.collaborationRoomMember.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ updatedAt: oldVersion }),
    }))
    expect(leftAt).toBeNull()
  })

  it("does not report membership as left when the socket server is unavailable", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Socket unavailable"))
    expect((await POST(request("socket-1"), params)).status).toBe(503)
    expect(prisma.collaborationRoomMember.updateMany).not.toHaveBeenCalled()
  })

  it("rejects unauthenticated and invalid requests", async () => {
    ;(auth as jest.Mock).mockResolvedValueOnce(null)
    expect((await POST(request("socket-1"), params)).status).toBe(401)
    expect((await POST(request(""), params)).status).toBe(400)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("does not forward a leave for another environment's room", async () => {
    ;(prisma.collaborationRoomMember.findFirst as jest.Mock).mockResolvedValue(null)
    expect((await POST(request("socket-1"), params)).status).toBe(204)
    expect(prisma.collaborationRoomMember.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { roomId: "room-1", userId: "user-1", room: { presenceScope: "local" } },
    }))
    expect(global.fetch).not.toHaveBeenCalled()
    expect(prisma.collaborationRoomMember.updateMany).not.toHaveBeenCalled()
  })

  it("does not mark membership left based on a different environment's response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, json: async () => ({ presenceScope: "production", presence: { roomId: "room-1", users: [] } }),
    })
    expect((await POST(request("socket-1"), params)).status).toBe(503)
    expect(prisma.collaborationRoomMember.updateMany).not.toHaveBeenCalled()
  })
})
