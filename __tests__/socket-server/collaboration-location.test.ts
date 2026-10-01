import { createServer, type Server as HttpServer } from "http"
import type { AddressInfo } from "net"
import { Server } from "socket.io"
import { io as createClient, type Socket as ClientSocket } from "socket.io-client"
import { createCollaborationRoomSocketToken } from "@/lib/collaboration/socket-token"
import type {
  CollaborationJoinAck,
  CollaborationLocation,
  CollaborationLocationAck,
  TypedServer,
} from "@/lib/socket/types"
import { leaveCollaborationRoomFromUnload, setupSocketHandlers } from "@/socket-server/handlers"

describe("collaboration room location socket events", () => {
  let httpServer: HttpServer
  let io: Server
  const clients: ClientSocket[] = []
  const roomId = `location-test-${Date.now()}`
  const secret = "location-test-secret"
  const previousSecret = process.env.SOCKET_INTERNAL_SECRET
  let url: string

  beforeAll(async () => {
    process.env.SOCKET_INTERNAL_SECRET = secret
    httpServer = createServer()
    io = new Server(httpServer)
    setupSocketHandlers(io as TypedServer)
    await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve))
    url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    for (const client of clients) client.disconnect()
    await new Promise<void>((resolve) => io.close(() => resolve()))
    if (previousSecret === undefined) delete process.env.SOCKET_INTERNAL_SECRET
    else process.env.SOCKET_INTERNAL_SECRET = previousSecret
  })

  async function connect(userId: string) {
    const { token } = createCollaborationRoomSocketToken({
      roomId,
      memberId: `member-${userId}`,
      userId,
      userName: userId,
      capacity: 2,
    }, secret)
    const client = createClient(url, {
      auth: { token },
      transports: ["websocket"],
      reconnection: false,
    })
    clients.push(client)
    await new Promise<void>((resolve, reject) => {
      client.once("connect", resolve)
      client.once("connect_error", reject)
    })
    return { client, token }
  }

  function join(client: ClientSocket, token: string) {
    return new Promise<CollaborationJoinAck>((resolve) => {
      client.emit("collaboration:join", { token }, resolve)
    })
  }

  function sendLocation(client: ClientSocket, input: Record<string, unknown>) {
    return new Promise<CollaborationLocationAck>((resolve) => {
      client.emit("collaboration:location", input, resolve)
    })
  }

  function sendTyping(client: ClientSocket, input: Record<string, unknown>) {
    return new Promise<CollaborationLocationAck>((resolve) => {
      client.emit("collaboration:typing", input, resolve)
    })
  }

  it("shares locations only within a joined room and hydrates late joiners", async () => {
    const alice = await connect("alice")
    const bob = await connect("bob")
    const input = {
      roomId,
      filePath: "src/app.ts",
      baseSha: "a".repeat(40),
      headSha: "b".repeat(40),
      side: "RIGHT",
      line: 42,
      selection: { side: "RIGHT", startLine: 42, endLine: 44 },
      textSelection: { side: "RIGHT", startLine: 42, endLine: 42, startOffset: 2, endOffset: 5 },
      viewport: { top: 0.6, left: 0.25, lineOffset: -12 },
    }

    expect(await sendLocation(alice.client, input)).toMatchObject({
      ok: false, error: { code: "NOT_JOINED" },
    })
    expect(await join(alice.client, alice.token)).toMatchObject({ ok: true, roomId })
    expect(await sendLocation(alice.client, { ...input, userId: "bob" })).toMatchObject({
      ok: false, error: { code: "INVALID_LOCATION" },
    })
    expect(await sendLocation(alice.client, input)).toEqual({ ok: true, roomId })

    const bobJoin = await join(bob.client, bob.token)
    expect(bobJoin.ok && bobJoin.locations).toEqual([
      expect.objectContaining({ ...input, userId: "alice" }),
    ])

    const received = new Promise<CollaborationLocation>((resolve) => {
      bob.client.once("collaboration:location", resolve)
    })
    expect(await sendLocation(alice.client, { ...input, line: 45 })).toEqual({ ok: true, roomId })
    expect(await received).toMatchObject({ ...input, line: 45, userId: "alice" })
    const released = new Promise<CollaborationLocation>((resolve) => {
      bob.client.once("collaboration:location", resolve)
    })
    expect(await sendLocation(alice.client, { ...input, selection: null, textSelection: null })).toEqual({ ok: true, roomId })
    expect(await released).toMatchObject({ selection: null, textSelection: null, userId: "alice" })
    expect(await sendLocation(bob.client, { ...input, roomId: "another-room" })).toMatchObject({
      ok: false, error: { code: "NOT_JOINED" },
    })

    const cleared = new Promise<{ roomId: string; userId: string }>((resolve) => {
      bob.client.once("collaboration:location:clear", resolve)
    })
    await new Promise<void>((resolve) => alice.client.emit("collaboration:location:stop", { roomId }, () => resolve()))
    expect(await cleared).toEqual({ roomId, userId: "alice" })

    await Promise.all([alice.client, bob.client].map((client) =>
      new Promise<void>((resolve) => client.emit("collaboration:leave", { roomId }, () => resolve()))
    ))
  })

  it("broadcasts code typing only from joined room members", async () => {
    const alice = await connect("typing-alice")
    const bob = await connect("typing-bob")
    const typing = {
      roomId,
      anchor: { filePath: "src/app.ts", side: "RIGHT", startLine: 42, baseSha: "a".repeat(40), headSha: "b".repeat(40) },
      isTyping: true,
    }
    expect(await sendTyping(alice.client, typing)).toMatchObject({ ok: false, error: { code: "NOT_JOINED" } })
    expect(await join(alice.client, alice.token)).toMatchObject({ ok: true })
    expect(await join(bob.client, bob.token)).toMatchObject({ ok: true })
    expect(await sendTyping(alice.client, { ...typing, userId: "forged" })).toMatchObject({ ok: false, error: { code: "INVALID_LOCATION" } })
    expect(await sendTyping(alice.client, { ...typing, roomId: "another-room" })).toMatchObject({ ok: false, error: { code: "NOT_JOINED" } })

    const started = new Promise<Record<string, unknown>>((resolve) => bob.client.once("collaboration:typing", resolve))
    expect(await sendTyping(alice.client, typing)).toEqual({ ok: true, roomId })
    expect(await started).toMatchObject({ ...typing, userId: "typing-alice", userName: "typing-alice" })

    const stopped = new Promise<Record<string, unknown>>((resolve) => bob.client.once("collaboration:typing", resolve))
    expect(await sendTyping(alice.client, { ...typing, isTyping: false })).toEqual({ ok: true, roomId })
    expect(await stopped).toMatchObject({ isTyping: false, userId: "typing-alice" })

    await Promise.all([alice.client, bob.client].map((client) =>
      new Promise<void>((resolve) => client.emit("collaboration:leave", { roomId }, () => resolve()))
    ))
  })

  it("removes a disconnected member immediately on unload without evicting another member", async () => {
    const alice = await connect("unload-alice")
    const bob = await connect("unload-bob")
    expect(await join(alice.client, alice.token)).toMatchObject({ ok: true })
    expect(await join(bob.client, bob.token)).toMatchObject({ ok: true })
    const aliceSocketId = alice.client.id!

    const reconnecting = new Promise<{ users: { userId: string; status: string }[] }>((resolve) => {
      bob.client.once("collaboration:presence", resolve)
    })
    alice.client.disconnect()
    expect((await reconnecting).users).toEqual(expect.arrayContaining([
      expect.objectContaining({ userId: "unload-alice", status: "reconnecting" }),
      expect.objectContaining({ userId: "unload-bob", status: "online" }),
    ]))

    leaveCollaborationRoomFromUnload(io as TypedServer, roomId, "unload-alice", "stale-socket")
    expect((await join(bob.client, bob.token))).toMatchObject({
      ok: true,
      presence: { users: expect.arrayContaining([expect.objectContaining({ userId: "unload-alice" })]) },
    })

    const removed = new Promise<{ users: { userId: string }[] }>((resolve) => {
      bob.client.once("collaboration:presence", resolve)
    })
    leaveCollaborationRoomFromUnload(io as TypedServer, roomId, "unload-alice", aliceSocketId)
    expect((await removed).users.map((user) => user.userId)).toEqual(["unload-bob"])

    leaveCollaborationRoomFromUnload(io as TypedServer, roomId, "unload-alice", bob.client.id!)
    expect((await join(bob.client, bob.token))).toMatchObject({
      ok: true,
      presence: { users: [expect.objectContaining({ userId: "unload-bob" })] },
    })
    await new Promise<void>((resolve) => bob.client.emit("collaboration:leave", { roomId }, () => resolve()))
  })
})
