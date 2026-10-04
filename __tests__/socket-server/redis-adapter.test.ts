import { createServer, type Server as HttpServer } from "http"
import type { AddressInfo } from "net"
import { Server } from "socket.io"
import { io as createClient, type Socket as ClientSocket } from "socket.io-client"
import { createCollaborationRoomSocketToken } from "@/lib/collaboration/socket-token"
import type {
  CollaborationJoinAck,
  CollaborationLocationAck,
  CollaborationPresenceSnapshot,
  TypedServer,
} from "@/lib/socket/types"
import type { CollaborationMessage } from "@/types/collaboration"
import { attachRedisAdapter, type RedisAdapterConnection } from "@/socket-server/redis"
import { setupSocketHandlers } from "@/socket-server/handlers"
import { drainRedisCollaborationConnections, leaveRedisRoomFromUnload } from "@/socket-server/redis-handlers"

type SocketNode = {
  httpServer: HttpServer
  io: Server
  redis: RedisAdapterConnection
  url: string
}

const describeWithRedis = process.env.REDIS_URL ? describe : describe.skip

describeWithRedis("Socket.IO Redis adapter", () => {
  const nodes: SocketNode[] = []
  const clients: ClientSocket[] = []
  const previousSecret = process.env.SOCKET_INTERNAL_SECRET

  async function createNode(collaboration = false): Promise<SocketNode> {
    const httpServer = createServer()
    const io = new Server(httpServer, { transports: ["websocket"] })
    const redis = await attachRedisAdapter(io as TypedServer, process.env.REDIS_URL)
    if (!redis) throw new Error("Redis adapter was not configured")

    if (collaboration) {
      setupSocketHandlers(io as TypedServer, redis.presence)
    } else {
      io.on("connection", (socket) => {
        socket.on("join-test-room", (roomId: string, ack: () => void) => {
          socket.join(roomId)
          ack()
        })
      })
    }
    await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve))
    const url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`
    const node = { httpServer, io, redis, url }
    nodes.push(node)
    return node
  }

  async function connect(url: string, token?: string) {
    const client = createClient(url, { autoConnect: false, transports: ["websocket"], auth: { token } })
    clients.push(client)
    const connected = new Promise<void>((resolve, reject) => {
      client.once("connect", resolve)
      client.once("connect_error", reject)
    })
    client.connect()
    await connected
    return client
  }

  async function join(client: ClientSocket, roomId: string) {
    await new Promise<void>((resolve) => client.emit("join-test-room", roomId, resolve))
  }

  async function waitForPresence(
    client: ClientSocket,
    predicate: (snapshot: CollaborationPresenceSnapshot) => boolean
  ) {
    return new Promise<CollaborationPresenceSnapshot>((resolve) => {
      const onPresence = (snapshot: CollaborationPresenceSnapshot) => {
        if (!predicate(snapshot)) {
          client.once("collaboration:presence", onPresence)
          return
        }
        resolve(snapshot)
      }
      client.once("collaboration:presence", onPresence)
    })
  }

  afterAll(async () => {
    for (const client of clients) client.disconnect()
    for (const node of nodes) {
      await new Promise<void>((resolve) => node.io.close(() => resolve()))
      node.redis.close()
    }
    if (previousSecret === undefined) delete process.env.SOCKET_INTERNAL_SECRET
    else process.env.SOCKET_INTERNAL_SECRET = previousSecret
  })

  it("forwards a room broadcast to a client connected to another server", async () => {
    const first = await createNode()
    const second = await createNode()
    const sender = await connect(first.url)
    const receiver = await connect(second.url)
    const roomId = `adapter-test-${Date.now()}`
    await join(sender, roomId)
    await join(receiver, roomId)

    const snapshot: CollaborationPresenceSnapshot = {
      roomId,
      generatedAt: new Date().toISOString(),
      users: [],
    }
    const received = new Promise<CollaborationPresenceSnapshot>((resolve) => {
      receiver.once("collaboration:presence", resolve)
    })
    ;(first.io as TypedServer).to(roomId).emit("collaboration:presence", snapshot)

    await expect(received).resolves.toEqual(snapshot)
  }, 15_000)

  it("shares room seats and presence across nodes, including a remote unload", async () => {
    process.env.SOCKET_INTERNAL_SECRET = "redis-presence-test-secret"
    const first = await createNode(true)
    const second = await createNode(true)
    const roomId = `redis-room-${Date.now()}`

    async function enter(node: SocketNode, userId: string) {
      const { token } = createCollaborationRoomSocketToken({
        roomId,
        userId,
        userName: userId,
        memberId: `member-${userId}`,
        capacity: 2,
      })
      const client = await connect(node.url, token)
      const response = await new Promise<CollaborationJoinAck>((resolve) =>
        client.emit("collaboration:join", { token }, resolve)
      )
      return { client, token, response }
    }

    const alice = await enter(first, "alice")
    expect(alice.response.ok).toBe(true)
    const crossNodePresence = new Promise<CollaborationPresenceSnapshot>((resolve) =>
      alice.client.once("collaboration:presence", (snapshot: CollaborationPresenceSnapshot) => {
        if (snapshot.users.length === 2) resolve(snapshot)
        else alice.client.once("collaboration:presence", resolve)
      })
    )
    const bob = await enter(second, "bob")
    expect(bob.response.ok).toBe(true)
    expect((await crossNodePresence).users).toHaveLength(2)

    const aliceSecondTab = await enter(second, "alice")
    expect(aliceSecondTab.response).toMatchObject({
      ok: true,
      presence: { users: expect.arrayContaining([
        expect.objectContaining({ userId: "alice", socketCount: 2 }),
      ]) },
    })
    const charlie = await enter(first, "charlie")
    expect(charlie.response).toMatchObject({ ok: false, error: { code: "ROOM_FULL" } })

    const disconnected = new Promise<void>((resolve) => alice.client.once("disconnect", () => resolve()))
    const afterUnload = await leaveRedisRoomFromUnload(
      second.io as TypedServer,
      second.redis.presence,
      roomId,
      "alice",
      alice.client.id!
    )
    expect(afterUnload.users.find((user) => user.userId === "alice")).toMatchObject({ socketCount: 1 })
    await disconnected

    for (const client of [bob.client, aliceSecondTab.client]) {
      await new Promise<void>((resolve) => client.emit("collaboration:leave", { roomId }, () => resolve()))
    }
  }, 20_000)

  it("keeps scaled collaboration semantics before increasing socket replicas", async () => {
    process.env.SOCKET_INTERNAL_SECRET = "redis-scale-test-secret"
    const first = await createNode(true)
    const second = await createNode(true)
    const roomId = `redis-scale-room-${Date.now()}`
    const capacity = 8

    async function enter(node: SocketNode, userId: string) {
      const { token } = createCollaborationRoomSocketToken({
        roomId,
        userId,
        userName: userId,
        memberId: `member-${userId}`,
        capacity,
      })
      const client = await connect(node.url, token)
      const response = await new Promise<CollaborationJoinAck>((resolve) =>
        client.emit("collaboration:join", { token }, resolve)
      )
      return { client, token, response, userId, nodeUrl: node.url }
    }

    const entrants = await Promise.all(
      Array.from({ length: 9 }, (_, index) =>
        enter(index % 2 === 0 ? first : second, `user-${index + 1}`)
      )
    )
    expect(entrants.filter((entrant) => entrant.response.ok)).toHaveLength(8)
    expect(entrants.filter((entrant) => !entrant.response.ok)).toHaveLength(1)
    expect(entrants.find((entrant) => !entrant.response.ok)?.response).toMatchObject({
      ok: false,
      error: { code: "ROOM_FULL" },
    })

    const accepted = entrants.filter((entrant) => entrant.response.ok)
    const rejected = entrants.find((entrant) => !entrant.response.ok)
    rejected?.client.disconnect()

    const duplicate = await enter(second, accepted[0].userId)
    expect(duplicate.response).toMatchObject({
      ok: true,
      presence: { users: expect.arrayContaining([
        expect.objectContaining({ userId: accepted[0].userId, socketCount: 2 }),
      ]) },
    })

    const message: CollaborationMessage = {
      id: "scale-message-1",
      roomId,
      authorId: accepted[0].userId,
      author: { id: accepted[0].userId, name: accepted[0].userId, image: null },
      content: "cross-node message",
      clientMessageId: "scale-message-client-id",
      codeReference: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const messageReceived = new Promise<CollaborationMessage>((resolve) =>
      accepted[1].client.once("collaboration:message", resolve)
    )
    ;(first.io as TypedServer).to(`collaboration:${roomId}`).emit("collaboration:message", message)
    await expect(messageReceived).resolves.toMatchObject({ id: message.id, content: message.content })

    const locationReceived = new Promise((resolve) =>
      accepted[1].client.once("collaboration:location", resolve)
    )
    const locationAck = await new Promise<CollaborationLocationAck>((resolve) =>
      accepted[0].client.emit("collaboration:location", {
        roomId,
        filePath: "app/example.ts",
        baseSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        headSha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        side: "RIGHT",
        line: 42,
        selection: { side: "RIGHT", startLine: 42, endLine: 43 },
        textSelection: null,
        viewport: { top: 0.12, left: 0 },
      }, resolve)
    )
    expect(locationAck).toMatchObject({ ok: true, roomId })
    await expect(locationReceived).resolves.toMatchObject({
      roomId,
      userId: accepted[0].userId,
      filePath: "app/example.ts",
      line: 42,
    })

    const firstNodeOnly = accepted.find((entrant) => entrant.nodeUrl === first.url && entrant.userId !== accepted[0].userId)
    expect(firstNodeOnly).toBeDefined()
    const reconnectingPresence = waitForPresence(
      accepted[1].client,
      (snapshot) => snapshot.users.some((user) =>
        user.userId === firstNodeOnly!.userId && user.status === "reconnecting"
      )
    )
    await drainRedisCollaborationConnections(first.io as TypedServer, first.redis.presence)
    await expect(reconnectingPresence).resolves.toMatchObject({ roomId })

    const burstReconnects = await Promise.all(
      accepted
        .filter((entrant) => entrant.client.disconnected)
        .map((entrant) => enter(second, entrant.userId))
    )
    expect(burstReconnects.every((entrant) => entrant.response.ok)).toBe(true)
    expect(burstReconnects[burstReconnects.length - 1]?.response).toMatchObject({
      ok: true,
      presence: { users: expect.any(Array) },
    })

    for (const entrant of [...accepted, duplicate, ...burstReconnects]) {
      if (entrant.client.connected) {
        await new Promise<void>((resolve) =>
          entrant.client.emit("collaboration:leave", { roomId }, () => resolve())
        )
      }
    }
  }, 30_000)
})
