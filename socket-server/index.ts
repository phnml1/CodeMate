import { createServer } from "http"
import type { IncomingMessage, ServerResponse } from "http"
import { timingSafeEqual } from "crypto"
import { Server } from "socket.io"
import { getCollaborationPresenceSnapshots, leaveCollaborationRoomFromUnload, setupSocketHandlers } from "./handlers"
import { attachRedisAdapter, type RedisAdapterConnection } from "./redis"
import {
  drainRedisCollaborationConnections,
  getRedisPresenceSnapshots,
  leaveRedisRoomFromUnload,
  reconcileRedisPresence,
} from "./redis-handlers"
import { getSocketMetrics, logCollaborationEvent, recordBroadcast } from "./observability"
import { getCollaborationPresenceScope } from "../lib/collaboration/presence-scope"
import type {
  InternalSocketEmitPayload,
  ServerToClientEventName,
  TypedServer,
} from "../lib/socket/types"

const port = parseInt(process.env.PORT || "4000", 10)
const allowedOrigin = process.env.NEXTJS_URL || "http://localhost:3000"
const startedAt = new Date().toISOString()
const presenceScope = getCollaborationPresenceScope()
let redisAdapter: RedisAdapterConnection | null = null
let draining = false
let reconciliationTimer: NodeJS.Timeout | null = null
let reconciliationRunning = false
let lastDbReconciliationAt = 0
const reconciliationAbort = new AbortController()

function isReady() {
  return !draining && (redisAdapter ? redisAdapter.isReady() : process.env.REDIS_URL === undefined)
}

function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = ""
    req.on("data", (chunk) => (body += chunk))
    req.on("end", () => {
      try {
        resolve(JSON.parse(body))
      } catch {
        reject(new Error("Invalid JSON"))
      }
    })
  })
}

const serverToClientEvents = new Set<ServerToClientEventName>([
  "comment:new",
  "comment:updated",
  "comment:deleted",
  "comment:reaction-updated",
  "typing:start",
  "typing:stop",
  "inline:typing:start",
  "inline:typing:stop",
  "notification:new",
  "collaboration:presence",
  "collaboration:message",
])

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isServerToClientEvent(event: unknown): event is ServerToClientEventName {
  return typeof event === "string" && serverToClientEvents.has(event as ServerToClientEventName)
}

function isInternalEmitPayload(body: unknown): body is InternalSocketEmitPayload {
  return (
    isObject(body) &&
    typeof body.room === "string" &&
    isServerToClientEvent(body.event) &&
    "data" in body
  )
}

function isAuthorizedInternalRequest(req: IncomingMessage) {
  const secret = req.headers["x-socket-secret"]
  const expected = process.env.SOCKET_INTERNAL_SECRET

  if (typeof secret !== "string" || !expected) return false

  const secretBuffer = Buffer.from(secret)
  const expectedBuffer = Buffer.from(expected)

  return (
    secretBuffer.length === expectedBuffer.length &&
    timingSafeEqual(secretBuffer, expectedBuffer)
  )
}

function emitInternalPayload(io: TypedServer, body: InternalSocketEmitPayload) {
  const startedAt = Date.now()
  const roomId = body.room.startsWith("collaboration:") ? body.room.slice("collaboration:".length) : undefined
  switch (body.event) {
    case "comment:new":
      io.to(body.room).emit("comment:new", body.data)
      break
    case "comment:updated":
      io.to(body.room).emit("comment:updated", body.data)
      break
    case "comment:deleted":
      io.to(body.room).emit("comment:deleted", body.data)
      break
    case "comment:reaction-updated":
      io.to(body.room).emit("comment:reaction-updated", body.data)
      break
    case "typing:start":
      io.to(body.room).emit("typing:start", body.data)
      break
    case "typing:stop":
      io.to(body.room).emit("typing:stop", body.data)
      break
    case "inline:typing:start":
      io.to(body.room).emit("inline:typing:start", body.data)
      break
    case "inline:typing:stop":
      io.to(body.room).emit("inline:typing:stop", body.data)
      break
    case "notification:new":
      io.to(body.room).emit("notification:new", body.data)
      break
    case "collaboration:presence":
      io.to(body.room).emit("collaboration:presence", body.data)
      break
    case "collaboration:message":
      io.to(body.room).emit("collaboration:message", body.data)
      break
  }
  recordBroadcast(body.event, roomId, startedAt, true)
}

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method === "GET" && req.url === "/health") {
    const ready = isReady()
    res.writeHead(ready ? 200 : 503, { "Content-Type": "text/plain" })
    res.end(ready ? "ok" : "Redis unavailable")
    return
  }

  if (req.method === "GET" && req.url === "/metrics") {
    if (!isAuthorizedInternalRequest(req)) {
      res.writeHead(401, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "Unauthorized" }))
      return
    }
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify(getSocketMetrics()))
    return
  }

  if (req.method === "POST" && req.url === "/internal/collaboration/presence") {
    if (!isAuthorizedInternalRequest(req)) {
      res.writeHead(401)
      res.end()
      return
    }
    if (req.headers["x-collaboration-scope"] !== presenceScope) {
      res.writeHead(409)
      res.end()
      return
    }
    if (!isReady()) {
      res.writeHead(503)
      res.end()
      return
    }
    try {
      const body = await parseBody(req)
      if (!isObject(body) || !Array.isArray(body.roomIds) || body.roomIds.length > 50 || body.roomIds.some((roomId) => typeof roomId !== "string" || !roomId || roomId.length > 128)) {
        res.writeHead(400)
        res.end()
        return
      }
      const rooms = redisAdapter
        ? await getRedisPresenceSnapshots(io, redisAdapter.presence, body.roomIds)
        : getCollaborationPresenceSnapshots(body.roomIds)
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ startedAt, presenceScope, rooms }))
    } catch (error) {
      logCollaborationEvent("collaboration.internal.presence.failed", {}, "error", error)
      res.writeHead(error instanceof Error && error.message === "Invalid JSON" ? 400 : 503)
      res.end()
    }
    return
  }

  if (req.method === "POST" && req.url === "/internal/collaboration/leave") {
    if (!isAuthorizedInternalRequest(req)) {
      res.writeHead(401)
      res.end()
      return
    }
    if (req.headers["x-collaboration-scope"] !== presenceScope) {
      res.writeHead(409)
      res.end()
      return
    }
    if (!isReady()) {
      res.writeHead(503)
      res.end()
      return
    }
    try {
      const body = await parseBody(req)
      if (!isObject(body) || typeof body.roomId !== "string" || typeof body.userId !== "string" || typeof body.socketId !== "string" || !body.roomId || !body.userId || !body.socketId) {
        res.writeHead(400)
        res.end()
        return
      }
      const presence = redisAdapter
        ? await leaveRedisRoomFromUnload(io, redisAdapter.presence, body.roomId, body.userId, body.socketId)
        : leaveCollaborationRoomFromUnload(io, body.roomId, body.userId, body.socketId)
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ presenceScope, presence }))
    } catch (error) {
      logCollaborationEvent("collaboration.internal.leave.failed", {}, "error", error)
      res.writeHead(error instanceof Error && error.message === "Invalid JSON" ? 400 : 503)
      res.end()
    }
    return
  }

  // Internal emit endpoint (called by Next.js API routes)
  if (req.method === "POST" && req.url === "/internal/emit") {
    if (!isAuthorizedInternalRequest(req)) {
      res.writeHead(401, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "Unauthorized" }))
      return
    }
    if (!isReady()) {
      res.writeHead(503, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "Socket unavailable" }))
      return
    }

    try {
      const body = await parseBody(req)
      if (!isInternalEmitPayload(body)) {
        res.writeHead(400, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: "Invalid emit payload" }))
        return
      }

      emitInternalPayload(io, body)
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ ok: true }))
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "Bad request" }))
    }
    return
  }

  res.writeHead(404)
  res.end()
})

const io: TypedServer = new Server(httpServer, {
  transports: ["websocket"],
  cors: {
    origin: allowedOrigin,
    credentials: true,
  },
})

async function startSocketServer() {
  redisAdapter = await attachRedisAdapter(io, process.env.REDIS_URL, () => {
    for (const socket of io.sockets.sockets.values()) socket.disconnect(true)
  })
  setupSocketHandlers(io, redisAdapter?.presence, isReady)
  httpServer.listen(port, () => {
    logCollaborationEvent("socket.server.ready", { port, presenceScope, mode: redisAdapter ? "redis" : "single-instance" })
  })
  if (redisAdapter) {
    const tick = async () => {
      if (reconciliationRunning || !isReady() || !redisAdapter) return
      reconciliationRunning = true
      try {
        await reconcileRedisPresence(io, redisAdapter.presence)
        if (Date.now() - lastDbReconciliationAt >= 60_000) {
          lastDbReconciliationAt = Date.now()
          if (await redisAdapter.presence.tryAcquireDbReconciliation()) {
            const secret = process.env.SOCKET_INTERNAL_SECRET
            if (!secret) throw new Error("SOCKET_INTERNAL_SECRET is missing")
            const response = await fetch(new URL("/api/internal/collaboration/reconcile", process.env.NEXTJS_URL ?? "http://localhost:3000"), {
              method: "POST",
              headers: { "x-socket-secret": secret, "x-collaboration-scope": presenceScope },
              signal: AbortSignal.any([reconciliationAbort.signal, AbortSignal.timeout(30_000)]),
            })
            if (!response.ok) throw new Error(`Collaboration DB reconciliation failed: ${response.status}`)
          }
        }
      } catch (error) {
        logCollaborationEvent("collaboration.reconciliation.failed", {}, "error", error)
      } finally {
        reconciliationRunning = false
      }
    }
    reconciliationTimer = setInterval(() => void tick(), 15_000)
    void tick()
  }
}

async function shutdown() {
  if (draining) return
  draining = true
  reconciliationAbort.abort()
  if (reconciliationTimer) clearInterval(reconciliationTimer)
  const deadline = setTimeout(() => {
    logCollaborationEvent("socket.shutdown.timed_out", {}, "error")
    process.exit(1)
  }, 10_000)
  try {
    if (redisAdapter) {
      await drainRedisCollaborationConnections(io, redisAdapter.presence)
    } else {
      for (const socket of io.sockets.sockets.values()) socket.disconnect(true)
    }
    await new Promise<void>((resolve) => io.close(() => resolve()))
    redisAdapter?.close()
  } finally {
    clearTimeout(deadline)
  }
}

process.once("SIGTERM", () => void shutdown().catch((error) => {
  logCollaborationEvent("socket.shutdown.failed", {}, "error", error)
  process.exit(1)
}))
process.once("SIGINT", () => void shutdown().catch((error) => {
  logCollaborationEvent("socket.shutdown.failed", {}, "error", error)
  process.exit(1)
}))

void startSocketServer().catch((error) => {
  logCollaborationEvent("socket.start.failed", {}, "error", error)
  process.exitCode = 1
})
