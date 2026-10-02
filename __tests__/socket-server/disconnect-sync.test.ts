import { syncCollaborationDisconnect } from "@/socket-server/disconnect-sync"

describe("syncCollaborationDisconnect", () => {
  const originalFetch = global.fetch
  const originalSecret = process.env.SOCKET_INTERNAL_SECRET

  beforeEach(() => {
    process.env.SOCKET_INTERNAL_SECRET = "test-secret"
    global.fetch = jest.fn().mockResolvedValue({ ok: true })
  })

  afterEach(() => {
    global.fetch = originalFetch
    if (originalSecret === undefined) delete process.env.SOCKET_INTERNAL_SECRET
    else process.env.SOCKET_INTERNAL_SECRET = originalSecret
    jest.clearAllMocks()
  })

  it("sends the disconnect snapshot to the protected API", async () => {
    const disconnectedAt = Date.parse("2026-10-02T00:00:00.000Z")
    await syncCollaborationDisconnect({ roomId: "room-1", memberId: "member-1", userId: "user-1", disconnectedAt })
    expect(global.fetch).toHaveBeenCalledWith(
      new URL("/api/internal/collaboration/disconnect", process.env.NEXTJS_URL ?? "http://localhost:3000"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ roomId: "room-1", memberId: "member-1", userId: "user-1", disconnectedAt: "2026-10-02T00:00:00.000Z" }),
      })
    )
  })
})
