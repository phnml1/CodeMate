import assert from "node:assert/strict"
import { before, after, describe, it } from "node:test"
import { randomUUID } from "crypto"
import { createServer, type Server } from "http"
import type { AddressInfo } from "net"
import Redis from "ioredis"
import { prisma } from "@/lib/prisma"
import { POST } from "@/app/api/internal/collaboration/reconcile/route"
import { RedisPresenceStore } from "@/socket-server/redis-presence"

const databaseUrl = process.env.PRESENCE_SCOPE_TEST_DATABASE_URL

describe("shared DB with isolated environment presence", { skip: !databaseUrl }, () => {
  const originalEnv = process.env
  const suffix = randomUUID()
  const localRoomId = `scope-local-${suffix}`
  const productionRoomId = `scope-production-${suffix}`
  const userId = `scope-user-${suffix}`
  const staleAt = new Date(0)
  let repoId: string
  let localMemberId: string
  let local: Redis
  let production: Redis
  let localStore: RedisPresenceStore
  let productionStore: RedisPresenceStore
  let server: Server
  let initialized = false
  let userCreated = false

  before(async () => {
    const url = new URL(databaseUrl!)
    if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/codemate_scope_test") {
      throw new Error("Presence scope integration requires the disposable local codemate_scope_test database")
    }
    const redisUrl = new URL(process.env.REDIS_URL ?? "redis://127.0.0.1:6379/15")
    if (!["localhost", "127.0.0.1"].includes(redisUrl.hostname)) {
      throw new Error("Presence scope integration requires local Redis")
    }
    process.env = {
      ...originalEnv, DATABASE_URL: databaseUrl!, DIRECT_DATABASE_URL: databaseUrl!,
      SOCKET_INTERNAL_SECRET: "scope-test-secret", COLLABORATION_PRESENCE_SCOPE: "local",
    }
    initialized = true
    redisUrl.pathname = "/15"
    local = new Redis(redisUrl.toString())
    redisUrl.pathname = "/14"
    production = new Redis(redisUrl.toString())
    localStore = new RedisPresenceStore(local)
    productionStore = new RedisPresenceStore(production)
    await prisma.user.create({ data: { id: userId, name: "Scope fixture" } })
    userCreated = true
    const repo = await prisma.repository.create({ data: {
      githubId: BigInt(Date.now()), name: suffix, fullName: `scope-test/${suffix}`,
      pullRequests: { create: {
        githubId: BigInt(Date.now()), number: 1, title: "Presence scope fixture", baseBranch: "main", headBranch: "test",
      } },
    }, include: { pullRequests: true } })
    repoId = repo.id
    for (const [id, presenceScope] of [[localRoomId, "local"], [productionRoomId, "production"]]) {
      const room = await prisma.collaborationRoom.create({ data: {
        id, name: presenceScope, presenceScope, pullRequestId: repo.pullRequests[0].id, ownerId: userId,
        members: { create: { userId, role: "OWNER", updatedAt: staleAt } },
      }, include: { members: true } })
      if (presenceScope === "local") localMemberId = room.members[0].id
    }
    await localStore.run(localRoomId, "join", {
      userId, memberId: localMemberId, userName: "Scope fixture", socketId: "live-local-socket", capacity: 8,
    })
    server = createServer(async (req, res) => {
      if (req.url !== "/internal/collaboration/presence" || req.headers["x-socket-secret"] !== "scope-test-secret") {
        res.writeHead(401).end()
        return
      }
      try {
        let raw = ""
        for await (const chunk of req) raw += chunk.toString()
        const scope = req.headers["x-collaboration-scope"]
        const store = scope === "local" ? localStore : productionStore
        const { roomIds } = JSON.parse(raw) as { roomIds: string[] }
        const rooms = await Promise.all(roomIds.map(async (roomId) => (await store.run(roomId, "snapshot")).presence))
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ presenceScope: scope, rooms }))
      } catch {
        res.writeHead(503).end()
      }
    })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    process.env.SOCKET_SERVER_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  }, { timeout: 30_000 })

  after(async () => {
    try {
      if (server) await new Promise<void>((resolve) => server.close(() => resolve()))
      for (const client of [local, production]) {
        if (!client) continue
        // Delete only this test's UUID-prefixed room keys, never the Redis database.
        for (const roomId of [localRoomId, productionRoomId]) {
          const keys = await client.keys(`codemate:collaboration:{${roomId}}:*`)
          if (keys.length) await client.del(...keys)
        }
        client.disconnect()
      }
      if (repoId) await prisma.repository.delete({ where: { id: repoId } })
      if (userCreated) await prisma.user.delete({ where: { id: userId } })
      if (initialized) await prisma.$disconnect()
    } finally {
      process.env = originalEnv
    }
  })

  it("reproduces the old false leave without any browser confirmation, then protects local membership", async () => {
    assert.equal((await localStore.run(localRoomId, "snapshot")).presence.users.length, 1)
    assert.equal((await productionStore.run(localRoomId, "snapshot")).presence.users.length, 0)
    // The pre-fix reconciliation query selected members from every environment.
    const unscoped = await prisma.collaborationRoomMember.findMany({
      where: { leftAt: null, updatedAt: { lte: new Date(Date.now() - 105_000) }, room: { status: "ACTIVE" } },
    })
    const selectedLocal = unscoped.find((member) => member.id === localMemberId)!
    assert.ok(selectedLocal)
    const oldResult = await prisma.collaborationRoomMember.updateMany({
      where: { id: selectedLocal.id, leftAt: null, updatedAt: selectedLocal.updatedAt },
      data: { leftAt: new Date() },
    })
    assert.equal(oldResult.count, 1)
    assert.equal((await localStore.run(localRoomId, "snapshot")).presence.users.length, 1)
    await prisma.collaborationRoomMember.update({ where: { id: localMemberId }, data: { leftAt: null, updatedAt: staleAt } })

    process.env.COLLABORATION_PRESENCE_SCOPE = "production"
    const response = await POST(new Request("http://localhost/api/internal/collaboration/reconcile", {
      method: "POST", headers: { "x-socket-secret": "scope-test-secret", "x-collaboration-scope": "production" },
    }))
    assert.deepEqual(await response.json(), { reconciled: 1 })
    assert.equal((await prisma.collaborationRoomMember.findUniqueOrThrow({ where: { id: localMemberId } })).leftAt, null)
    assert.equal((await localStore.run(localRoomId, "snapshot")).presence.users.length, 1)
  })

  it("preserves its own online member and still cleans up after that member actually leaves", async () => {
    process.env.COLLABORATION_PRESENCE_SCOPE = "local"
    const request = () => new Request("http://localhost/api/internal/collaboration/reconcile", {
      method: "POST", headers: { "x-socket-secret": "scope-test-secret", "x-collaboration-scope": "local" },
    })
    assert.deepEqual(await (await POST(request())).json(), { reconciled: 0 })
    await localStore.run(localRoomId, "leave", { userId, socketId: "live-local-socket" })
    assert.deepEqual(await (await POST(request())).json(), { reconciled: 1 })
    assert.notEqual((await prisma.collaborationRoomMember.findUniqueOrThrow({ where: { id: localMemberId } })).leftAt, null)
  })
})
