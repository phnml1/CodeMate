import type Redis from "ioredis"
import { RedisPresenceStore, type RedisPresenceResult } from "@/socket-server/redis-presence"
import { syncCollaborationDisconnect } from "@/socket-server/disconnect-sync"

jest.mock("@/socket-server/disconnect-sync", () => ({
  syncCollaborationDisconnect: jest.fn(),
}))

it("retries an expired member's DB sync after a transient failure", async () => {
  const roomId = "room-1"
  const pendingKey = `codemate:collaboration:{${roomId}}:pending-disconnect`
  const pending = JSON.stringify({ memberId: "member-1", userId: "user-1", disconnectedAt: 1000 })
  const client = {
    scan: jest.fn().mockResolvedValue(["0", [`codemate:collaboration:{${roomId}}:users`, pendingKey]]),
    hgetall: jest.fn().mockResolvedValue({ "member-1": pending }),
    eval: jest.fn().mockResolvedValue(1),
  }
  const store = new RedisPresenceStore(client as unknown as Redis)
  const snapshot: RedisPresenceResult = {
    ok: true,
    changed: true,
    presence: { roomId, generatedAt: new Date().toISOString(), users: [] },
    locations: [],
    clearedUserIds: [],
    removed: [],
    serverTime: new Date().toISOString(),
  }
  jest.spyOn(store, "run").mockResolvedValue(snapshot)
  const sync = syncCollaborationDisconnect as jest.Mock
  sync.mockRejectedValueOnce(new Error("temporary outage")).mockResolvedValueOnce(undefined)
  const log = jest.spyOn(console, "error").mockImplementation(() => {})

  try {
    const onSnapshot = jest.fn()
    await store.reconcileExpired(onSnapshot)
    expect(client.eval).not.toHaveBeenCalled()
    expect(onSnapshot).toHaveBeenCalledWith(snapshot)

    await store.reconcileExpired(onSnapshot)
    expect(sync).toHaveBeenCalledWith({ roomId, memberId: "member-1", userId: "user-1", disconnectedAt: 1000 })
    expect(client.eval).toHaveBeenCalledWith(expect.any(String), 1, pendingKey, "member-1", pending)
  } finally {
    log.mockRestore()
  }
})
