import { CollaborationPresenceUnavailableError, getCollaborationPresence } from "@/lib/socket/presence"

describe("getCollaborationPresence environment guard", () => {
  const originalFetch = global.fetch
  const env = process.env
  beforeEach(() => {
    process.env = { ...env, SOCKET_INTERNAL_SECRET: "test-secret", COLLABORATION_PRESENCE_SCOPE: "local" }
  })
  afterEach(() => { global.fetch = originalFetch; process.env = env })

  it("sends the scope and accepts a snapshot only from the same environment", async () => {
    const data = { presenceScope: "local", startedAt: new Date().toISOString(), rooms: [{ roomId: "room-1", users: [] }] }
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => data })
    expect(await getCollaborationPresence(["room-1"])).toEqual(data)
    expect(global.fetch).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({
      headers: expect.objectContaining({ "x-collaboration-scope": "local" }),
    }))
  })

  it("does not treat foreign or unscoped empty snapshots as an authoritative absence", async () => {
    for (const presenceScope of ["production", undefined]) {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true, json: async () => ({ presenceScope, rooms: [{ roomId: "room-1", users: [] }] }),
      })
      await expect(getCollaborationPresence(["room-1"])).rejects.toBeInstanceOf(CollaborationPresenceUnavailableError)
    }
  })
})
