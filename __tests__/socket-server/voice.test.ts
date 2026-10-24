import { createHmac, randomUUID } from "crypto"
import { createServer, type Server as HttpServer } from "http"
import type { AddressInfo } from "net"
import { Server } from "socket.io"
import { io as createClient, type Socket as ClientSocket } from "socket.io-client"
import { createCollaborationRoomSocketToken } from "@/lib/collaboration/socket-token"
import type { CollaborationVoiceAck, TypedServer } from "@/lib/socket/types"
import { setupSocketHandlers } from "@/socket-server/handlers"
import { leaveCollaborationRoomFromUnload } from "@/socket-server/handlers"
import { attachRedisAdapter, type RedisAdapterConnection } from "@/socket-server/redis"

type Node = { http: HttpServer; io: Server; url: string; redis: RedisAdapterConnection | null }
const previousSecret = process.env.SOCKET_INTERNAL_SECRET
const previousVoice = process.env.COLLABORATION_VOICE_ENABLED
const secret = `voice-test-${randomUUID()}`
const nodes: Node[] = []
const clients: ClientSocket[] = []
const joinedRooms = new Map<ClientSocket, string>()

async function createNode(redisUrl?: string) {
  const http = createServer()
  const io = new Server(http, { transports: ["websocket"] })
  const redis = redisUrl ? await attachRedisAdapter(io as TypedServer, redisUrl) : null
  setupSocketHandlers(io as TypedServer, redis?.presence, () => true, redis?.voiceSeats)
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve))
  const url = `http://127.0.0.1:${(http.address() as AddressInfo).port}`
  const node = { http, io, url, redis }
  nodes.push(node)
  return node
}

async function connect(url: string, userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId, userName: userId, exp: Math.floor(Date.now() / 1000) + 120 })).toString("base64url")
  const token = `${payload}.${createHmac("sha256", secret).update(payload).digest("hex")}`
  const client = createClient(url, { autoConnect: false, transports: ["websocket"], auth: { token } })
  clients.push(client)
  await new Promise<void>((resolve, reject) => {
    client.once("connect", resolve)
    client.once("connect_error", reject)
    client.connect()
  })
  return client
}

async function joinRoom(client: ClientSocket, roomId: string, userId: string, shouldJoin = true) {
  const { token } = createCollaborationRoomSocketToken({ roomId, userId, userName: userId, memberId: `member-${userId}`, capacity: 8 })
  const ack = await client.timeout(3_000).emitWithAck("collaboration:join", { token })
  expect(ack.ok).toBe(shouldJoin)
  if (shouldJoin) joinedRooms.set(client, roomId)
  return ack
}

async function joinVoice(client: ClientSocket, roomId: string): Promise<CollaborationVoiceAck> {
  return client.timeout(3_000).emitWithAck("collaboration:voice:join", { roomId })
}

beforeAll(() => {
  process.env.SOCKET_INTERNAL_SECRET = secret
  process.env.COLLABORATION_VOICE_ENABLED = "1"
})

afterAll(async () => {
  for (const client of clients) {
    const roomId = joinedRooms.get(client)
    if (client.connected && roomId) {
      await client.timeout(3_000).emitWithAck("collaboration:leave", { roomId }).catch(() => {})
    }
    client.disconnect()
  }
  for (const node of nodes) {
    await new Promise<void>((resolve) => node.io.close(() => resolve()))
    node.redis?.close()
  }
  if (previousSecret === undefined) delete process.env.SOCKET_INTERNAL_SECRET
  else process.env.SOCKET_INTERNAL_SECRET = previousSecret
  if (previousVoice === undefined) delete process.env.COLLABORATION_VOICE_ENABLED
  else process.env.COLLABORATION_VOICE_ENABLED = previousVoice
})

it("restricts voice to joined members and the room to four unique users", async () => {
  const node = await createNode()
  const roomId = `voice-${randomUUID()}`
  const users = await Promise.all(Array.from({ length: 5 }, async (_, index) => {
    const userId = `voice-user-${index}`
    return connect(node.url, userId)
  }))
  await Promise.all(users.slice(0, 4).map((client, index) => joinRoom(client, roomId, `voice-user-${index}`)))
  expect(await joinRoom(users[4], roomId, "voice-user-4", false)).toMatchObject({
    error: { code: "ROOM_FULL" },
  })
  const outsider = await connect(node.url, "outsider")
  const outsiderAck = await joinVoice(outsider, roomId)
  expect(outsiderAck).toMatchObject({ ok: false, error: { code: "VOICE_NOT_JOINED" } })
  expect(await users[0].timeout(3_000).emitWithAck("collaboration:voice:join", null as never))
    .toMatchObject({ ok: false, error: { code: "VOICE_NOT_JOINED" } })
  ;(users[0].emit as (...args: unknown[]) => void)("collaboration:voice:join", null)

  const results = await Promise.all(users.slice(0, 4).map((client) => joinVoice(client, roomId)))
  expect(results.filter((result) => result.ok)).toHaveLength(4)
  expect(await joinVoice(users[4], roomId)).toMatchObject({ ok: false, error: { code: "VOICE_NOT_JOINED" } })
  const sameUserTab = await connect(node.url, "voice-user-0")
  await joinRoom(sameUserTab, roomId, "voice-user-0")
  expect(await joinVoice(sameUserTab, roomId)).toMatchObject({ ok: false, error: { code: "VOICE_ALREADY_JOINED" } })
  expect((await users[0].timeout(3_000).emitWithAck("collaboration:voice:leave", { roomId })).ok).toBe(true)
  expect((await joinVoice(sameUserTab, roomId)).ok).toBe(true)
})

it("relays signals only between voice participants and reports departures", async () => {
  const node = await createNode()
  const roomId = `voice-${randomUUID()}`
  const alice = await connect(node.url, "alice")
  const bob = await connect(node.url, "bob")
  const watcher = await connect(node.url, "watcher")
  await Promise.all([joinRoom(alice, roomId, "alice"), joinRoom(bob, roomId, "bob"), joinRoom(watcher, roomId, "watcher")])
  expect((await joinVoice(alice, roomId)).ok).toBe(true)
  const joined = new Promise((resolve) => alice.once("collaboration:voice:participant-joined", resolve))
  expect((await joinVoice(bob, roomId)).ok).toBe(true)
  await expect(joined).resolves.toMatchObject({ roomId, participant: { socketId: bob.id, userId: "bob" } })

  const invalid = await watcher.timeout(3_000).emitWithAck("collaboration:voice:signal", {
    roomId, toSocketId: bob.id, kind: "offer", sdp: "v=0",
  })
  expect(invalid).toMatchObject({ ok: false, error: { code: "VOICE_NOT_JOINED" } })
  const outsideTarget = await alice.timeout(3_000).emitWithAck("collaboration:voice:signal", {
    roomId, toSocketId: watcher.id, kind: "offer", sdp: "v=0",
  })
  expect(outsideTarget).toMatchObject({ ok: false, error: { code: "VOICE_TARGET_UNAVAILABLE" } })
  const received = new Promise((resolve) => bob.once("collaboration:voice:signal", resolve))
  const sent = await alice.timeout(3_000).emitWithAck("collaboration:voice:signal", {
    roomId, toSocketId: bob.id, kind: "offer", sdp: "v=0", fromSocketId: "spoofed",
  })
  expect(sent.ok).toBe(true)
  await expect(received).resolves.toMatchObject({ roomId, fromSocketId: alice.id, fromUserId: "alice", sdp: "v=0" })

  const left = new Promise((resolve) => alice.once("collaboration:voice:participant-left", resolve))
  const bobSocketId = bob.id
  bob.disconnect()
  await expect(left).resolves.toEqual({ roomId, socketId: bobSocketId })
  await new Promise<void>((resolve) => setImmediate(resolve))
  leaveCollaborationRoomFromUnload(node.io as TypedServer, roomId, "bob", bobSocketId!)
})

const itWithRedis = process.env.REDIS_URL ? it : it.skip

itWithRedis("shares voice seats and signals across Redis-backed replicas", async () => {
  const first = await createNode(process.env.REDIS_URL)
  const second = await createNode(process.env.REDIS_URL)
  const roomId = `voice-redis-${randomUUID()}`
  const users = await Promise.all(Array.from({ length: 5 }, async (_, index) => {
    const userId = `redis-user-${index}`
    return connect(index % 2 ? first.url : second.url, userId)
  }))
  await Promise.all(users.slice(0, 4).map((client, index) => joinRoom(client, roomId, `redis-user-${index}`)))
  expect(await joinRoom(users[4], roomId, "redis-user-4", false)).toMatchObject({ error: { code: "ROOM_FULL" } })
  const results = await Promise.all(users.slice(0, 4).map((client) => joinVoice(client, roomId)))
  expect(results.filter((result) => result.ok)).toHaveLength(4)
  const received = new Promise((resolve) => users[1].once("collaboration:voice:signal", resolve))
  const ack = await users[0].timeout(3_000).emitWithAck("collaboration:voice:signal", {
    roomId, toSocketId: users[1].id, kind: "offer", sdp: "v=0",
  })
  expect(ack.ok).toBe(true)
  await expect(received).resolves.toMatchObject({ fromSocketId: users[0].id })
}, 15_000)

it("rejects voice joins when the Socket feature flag is off", async () => {
  process.env.COLLABORATION_VOICE_ENABLED = "0"
  try {
    const node = await createNode()
    const roomId = `voice-disabled-${randomUUID()}`
    const client = await connect(node.url, "disabled-user")
    await joinRoom(client, roomId, "disabled-user")
    expect(await joinVoice(client, roomId)).toMatchObject({ ok: false, error: { code: "VOICE_DISABLED" } })
  } finally {
    process.env.COLLABORATION_VOICE_ENABLED = "1"
  }
})
