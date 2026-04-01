import { createServer } from "http"
import type { IncomingMessage, ServerResponse } from "http"
import { Server } from "socket.io"
import { setupSocketHandlers } from "./handlers"
import type { TypedServer } from "./types"

const port = parseInt(process.env.PORT || "4000", 10)
const allowedOrigin = process.env.NEXTJS_URL || "http://localhost:3000"

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

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  // Health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" })
    res.end("ok")
    return
  }

  // Internal emit endpoint (called by Next.js API routes)
  if (req.method === "POST" && req.url === "/internal/emit") {
    const secret = req.headers["x-socket-secret"]
    if (!secret || secret !== process.env.SOCKET_INTERNAL_SECRET) {
      res.writeHead(401, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "Unauthorized" }))
      return
    }

    try {
      const body = (await parseBody(req)) as { event: string; room: string; data: unknown }
      io.to(body.room).emit(body.event as keyof any, body.data)
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
