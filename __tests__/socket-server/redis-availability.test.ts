import { createServer, type Server as HttpServer } from "http"
import type { AddressInfo } from "net"
import { Server } from "socket.io"
import { io as createClient, type Socket as ClientSocket } from "socket.io-client"
import { createCollaborationRoomSocketToken } from "@/lib/collaboration/socket-token"
import type { CollaborationJoinAck, TypedServer } from "@/lib/socket/types"
import { setupSocketHandlers } from "@/socket-server/handlers"
import { drainRedisCollaborationConnections } from "@/socket-server/redis-handlers"
import type { RedisPresenceResult, RedisPresenceStore } from "@/socket-server/redis-presence"

it("rejects admission when Redis is unavailable and drains only local connections", async () => {
  const previousSecret = process.env.SOCKET_INTERNAL_SECRET
  process.env.SOCKET_INTERNAL_SECRET = "availability-test-secret"
  let available = true
  const snapshot: RedisPresenceResult = {
    ok: true,
    changed: true,
    presence: { roomId: "room-1", generatedAt: new Date().toISOString(), users: [] },
    locations: [],
    clearedUserIds: [],
    removed: [],
    serverTime: new Date().toISOString(),
  }
  const store = { run: jest.fn().mockResolvedValue(snapshot) } as unknown as RedisPresenceStore
  const httpServer: HttpServer = createServer()
  const io = new Server(httpServer, { transports: ["websocket"] })
  setupSocketHandlers(io as TypedServer, store, () => available)
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve))

  const { token } = createCollaborationRoomSocketToken({
    roomId: "room-1", userId: "user-1", userName: "User", memberId: "member-1", capacity: 2,
  })
  const client: ClientSocket = createClient(`http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`, {
    auth: { token }, transports: ["websocket"], reconnection: false, autoConnect: false,
  })

  try {
    await new Promise<void>((resolve, reject) => {
      client.once("connect", resolve)
      client.once("connect_error", reject)
      client.connect()
    })
    available = false
    const refused = await new Promise<CollaborationJoinAck>((resolve) => client.emit("collaboration:join", { token }, resolve))
    expect(refused).toMatchObject({ ok: false, error: { code: "SERVICE_UNAVAILABLE" } })
    expect(store.run).not.toHaveBeenCalled()

    available = true
    const joined = await new Promise<CollaborationJoinAck>((resolve) => client.emit("collaboration:join", { token }, resolve))
    expect(joined.ok).toBe(true)
    const disconnected = new Promise<void>((resolve) => client.once("disconnect", () => resolve()))
    available = false
    await drainRedisCollaborationConnections(io as TypedServer, store)
    await disconnected
    expect(store.run).toHaveBeenCalledWith("room-1", "disconnect", { userId: "user-1", socketId: expect.any(String) })
  } finally {
    client.disconnect()
    await new Promise<void>((resolve) => io.close(() => resolve()))
    if (previousSecret === undefined) delete process.env.SOCKET_INTERNAL_SECRET
    else process.env.SOCKET_INTERNAL_SECRET = previousSecret
  }
})
