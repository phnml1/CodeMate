import { POST } from "@/app/api/internal/collaboration/disconnect/route"
import { prisma } from "@/lib/prisma"

jest.mock("@/lib/prisma", () => ({
  prisma: { collaborationRoomMember: { updateMany: jest.fn() } },
}))

const disconnectedAt = "2026-10-02T00:00:00.000Z"
const request = (secret: string, body: unknown) => new Request("http://localhost/api/internal/collaboration/disconnect", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-socket-secret": secret },
  body: JSON.stringify(body),
})

describe("POST /api/internal/collaboration/disconnect", () => {
  const previousSecret = process.env.SOCKET_INTERNAL_SECRET

  beforeEach(() => {
    process.env.SOCKET_INTERNAL_SECRET = "test-secret"
  })

  afterEach(() => {
    if (previousSecret === undefined) delete process.env.SOCKET_INTERNAL_SECRET
    else process.env.SOCKET_INTERNAL_SECRET = previousSecret
    jest.clearAllMocks()
  })

  it("rejects a missing or incorrect internal secret", async () => {
    expect((await POST(request("wrong", { roomId: "room-1" }))).status).toBe(401)
    expect((await POST(request("test-secret-extra", { roomId: "room-1" }))).status).toBe(401)
    expect(prisma.collaborationRoomMember.updateMany).not.toHaveBeenCalled()
  })

  it("marks only the disconnected membership version as left", async () => {
    const response = await POST(request("test-secret", {
      roomId: "room-1",
      memberId: "member-1",
      userId: "user-1",
      disconnectedAt,
    }))

    expect(response.status).toBe(204)
    expect(prisma.collaborationRoomMember.updateMany).toHaveBeenCalledWith({
      where: {
        id: "member-1", roomId: "room-1", userId: "user-1", leftAt: null,
        updatedAt: { lte: new Date(disconnectedAt) },
      },
      data: { leftAt: new Date(disconnectedAt) },
    })
  })

  it("rejects malformed disconnect timestamps", async () => {
    expect((await POST(request("test-secret", {
      roomId: "room-1", memberId: "member-1", userId: "user-1", disconnectedAt: "bad",
    }))).status).toBe(400)
    expect(prisma.collaborationRoomMember.updateMany).not.toHaveBeenCalled()
  })
})
