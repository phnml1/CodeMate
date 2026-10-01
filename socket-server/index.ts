import { createServer } from "http"
import type { IncomingMessage, ServerResponse } from "http"
import { timingSafeEqual } from "crypto"
import { Server } from "socket.io"
import { getCollaborationPresenceSnapshots, leaveCollaborationRoomFromUnload, setupSocketHandlers } from "./handlers"
import type {
  InternalSocketEmitPayload,
  ServerToClientEventName,
  TypedServer,
} from "../lib/socket/types"

const port = parseInt(process.env.PORT || "4000", 10)
const allowedOrigin = process.env.NEXTJS_URL || "http://localhost:3000"
const startedAt = new Date().toISOString()

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
}

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  // Health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" })
    res.end("ok")
    return
  }

  if (req.method === "POST" && req.url === "/internal/collaboration/presence") {
    if (!isAuthorizedInternalRequest(req)) {
      res.writeHead(401)
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
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ startedAt, rooms: getCollaborationPresenceSnapshots(body.roomIds) }))
    } catch {
      res.writeHead(400)
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
    try {
      const body = await parseBody(req)
      if (!isObject(body) || typeof body.roomId !== "string" || typeof body.userId !== "string" || typeof body.socketId !== "string" || !body.roomId || !body.userId || !body.socketId) {
        res.writeHead(400)
        res.end()
        return
      }
      const presence = leaveCollaborationRoomFromUnload(io, body.roomId, body.userId, body.socketId)
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ presence }))
    } catch {
      res.writeHead(400)
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
  cors: {
    origin: allowedOrigin,
    credentials: true,
  },
})

setupSocketHandlers(io)

httpServer.listen(port, () => {
  console.log(`> Socket.io server ready on port ${port}`)
})
