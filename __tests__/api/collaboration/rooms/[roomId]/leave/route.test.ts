import { POST } from "@/app/api/collaboration/rooms/[roomId]/leave/route"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/prisma", () => ({ prisma: { collaborationRoomMember: { updateMany: jest.fn() } } }))

const params = { params: Promise.resolve({ roomId: "room-1" }) }
const request = (socketId: unknown) => new Request("http://localhost/api/collaboration/rooms/room-1/leave", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ socketId }),
})

describe("POST /api/collaboration/rooms/[roomId]/leave", () => {
  const originalSecret = process.env.SOCKET_INTERNAL_SECRET
  const originalFetch = global.fetch

  beforeEach(() => {
    process.env.SOCKET_INTERNAL_SECRET = "test-secret"
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } })
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ presence: { roomId: "room-1", users: [] } }),
    })
  })

  afterEach(() => {
    global.fetch = originalFetch
    if (originalSecret === undefined) delete process.env.SOCKET_INTERNAL_SECRET
    else process.env.SOCKET_INTERNAL_SECRET = originalSecret
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
      where: { roomId: "room-1", userId: "user-1", leftAt: null },
    }))
  })

  it("keeps membership when another socket of the same user is still present", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ presence: { roomId: "room-1", users: [{ userId: "user-1" }] } }),
    })
    expect((await POST(request("socket-1"), params)).status).toBe(204)
    expect(prisma.collaborationRoomMember.updateMany).not.toHaveBeenCalled()
  })

  it("rejects unauthenticated and invalid requests", async () => {
    ;(auth as jest.Mock).mockResolvedValueOnce(null)
    expect((await POST(request("socket-1"), params)).status).toBe(401)
    expect((await POST(request(""), params)).status).toBe(400)
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
