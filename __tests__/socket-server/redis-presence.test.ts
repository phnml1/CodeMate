import Redis from "ioredis"
import { randomUUID } from "crypto"
import {
  COLLABORATION_CRASH_CONVERGENCE_MS,
  COLLABORATION_PRESENCE_CONVERGENCE_MS,
  COLLABORATION_SOCKET_LEASE_MS,
  RedisPresenceStore,
} from "@/socket-server/redis-presence"
import {
  COLLABORATION_HEARTBEAT_INTERVAL_MS,
  COLLABORATION_RECONNECT_GRACE_MS,
} from "@/lib/collaboration/socket-token"

jest.mock("@/socket-server/disconnect-sync", () => ({
  syncCollaborationDisconnect: jest.fn().mockResolvedValue(undefined),
}))

const describeWithRedis = process.env.REDIS_URL ? describe : describe.skip

describeWithRedis("Redis collaboration presence", () => {
  const clients: Redis[] = []
  const roomIds: string[] = []
  let first: RedisPresenceStore
  let second: RedisPresenceStore

  beforeAll(async () => {
    const url = process.env.REDIS_URL!
    const firstClient = new Redis(url)
    const secondClient = new Redis(url)
    clients.push(firstClient, secondClient)
    await Promise.all(clients.map((client) => client.ping()))
    first = new RedisPresenceStore(firstClient)
    second = new RedisPresenceStore(secondClient)
  })

  afterAll(async () => {
    if (!clients.length) return
    for (const roomId of roomIds) {
      const keys = await clients[0].keys(`codemate:collaboration:{${roomId}}:*`)
      if (keys.length) await clients[0].del(...keys)
    }
    await Promise.all(clients.map((client) => client.quit()))
  })

  function room() {
    const roomId = randomUUID()
    roomIds.push(roomId)
    return roomId
  }

  function join(store: RedisPresenceStore, roomId: string, userId: string, socketId: string, capacity = 2) {
    return store.run(roomId, "join", {
      userId,
      socketId,
      memberId: `member-${userId}`,
      userName: userId,
      capacity,
    })
  }

  it("reserves one seat for concurrent tabs across instances and shares code locations", async () => {
    const roomId = room()
    const joins = await Promise.all([
      join(first, roomId, "alice", "alice-tab-1"),
      join(second, roomId, "alice", "alice-tab-2"),
      join(second, roomId, "bob", "bob-tab"),
    ])
    expect(joins.every((result) => result.ok)).toBe(true)
    expect((await first.run(roomId, "snapshot")).presence.users).toEqual([
      expect.objectContaining({ userId: "alice", socketCount: 2, status: "online" }),
      expect.objectContaining({ userId: "bob", socketCount: 1, status: "online" }),
    ])
    expect((await join(first, roomId, "charlie", "charlie-tab")).ok).toBe(false)

    const location = {
      roomId,
      userId: "alice",
      filePath: "src/app.ts",
      baseSha: "a".repeat(40),
      headSha: "b".repeat(40),
      side: "RIGHT" as const,
      line: 42,
      selection: null,
    }
    expect((await first.run(roomId, "location", {
      userId: "alice", socketId: "alice-tab-1", location,
    })).ok).toBe(true)
    expect((await second.run(roomId, "snapshot")).locations).toEqual([
      expect.objectContaining(location),
    ])

    const oneTabLeft = await second.run(roomId, "leave", { userId: "alice", socketId: "alice-tab-1" })
    expect(oneTabLeft.presence.users[0]).toMatchObject({ userId: "alice", socketCount: 1 })
    expect(oneTabLeft.locations).toHaveLength(1)

    const reconnecting = await first.run(roomId, "disconnect", { userId: "alice", socketId: "alice-tab-2" })
    expect(reconnecting.presence.users[0]).toMatchObject({ userId: "alice", status: "reconnecting" })
    expect((await join(second, roomId, "charlie", "charlie-tab")).ok).toBe(false)

    expect((await join(second, roomId, "alice", "alice-tab-3")).ok).toBe(true)
    expect((await first.run(roomId, "unload", { userId: "alice", socketId: "alice-tab-2" })).ok).toBe(false)
    expect((await first.run(roomId, "snapshot")).locations).toHaveLength(1)

    const lastTabLeft = await second.run(roomId, "leave", { userId: "alice", socketId: "alice-tab-3" })
    expect(lastTabLeft.presence.users.map((user) => user.userId)).toEqual(["bob"])
    expect(lastTabLeft.clearedUserIds).toEqual(["alice"])
    expect((await join(first, roomId, "charlie", "charlie-tab")).ok).toBe(true)
  })

  it("converges after a crashed instance stops renewing its lease", async () => {
    expect(COLLABORATION_SOCKET_LEASE_MS).toBe(COLLABORATION_HEARTBEAT_INTERVAL_MS * 2)
    expect(COLLABORATION_CRASH_CONVERGENCE_MS).toBe(80_000)
    expect(COLLABORATION_PRESENCE_CONVERGENCE_MS).toBe(105_000)
    expect(COLLABORATION_RECONNECT_GRACE_MS).toBe(30_000)

    // Short timings exercise the production lease + grace sequence without an 80s test.
    const store = new RedisPresenceStore(clients[0], 600, 600)
    const observer = new RedisPresenceStore(clients[1], 600, 600)
    const roomId = room()
    expect((await join(store, roomId, "alice", "crashed-socket", 1)).ok).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 700))
    expect((await observer.run(roomId, "snapshot")).presence.users[0]).toMatchObject({
      userId: "alice", status: "reconnecting", socketCount: 0,
    })
    expect((await join(observer, roomId, "bob", "bob-tab", 1)).ok).toBe(false)
    await new Promise((resolve) => setTimeout(resolve, 650))
    expect((await observer.run(roomId, "snapshot")).presence.users).toEqual([])
    const pending = await clients[1].hgetall(`codemate:collaboration:{${roomId}}:pending-disconnect`)
    expect(Object.keys(pending)).toEqual(["member-alice"])
    await observer.reconcileExpired(() => {})
    expect(await clients[1].hlen(`codemate:collaboration:{${roomId}}:pending-disconnect`)).toBe(0)
    expect((await join(observer, roomId, "bob", "bob-tab", 1)).ok).toBe(true)
  })

  it("admits only one of two concurrent users for the final seat", async () => {
    const roomId = room()
    const results = await Promise.all([
      join(first, roomId, "alice", "alice-tab", 1),
      join(second, roomId, "bob", "bob-tab", 1),
    ])
    expect(results.filter((result) => result.ok)).toHaveLength(1)
    expect((await first.run(roomId, "snapshot")).presence.users).toHaveLength(1)
  })
})
