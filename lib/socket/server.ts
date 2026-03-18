import { Server as HTTPServer } from "http"
import type { TypedServer } from "./types"
import { Server } from "socket.io"
import { setupSocketHandlers } from "./handlers"

declare global {
  var __socketServer: TypedServer | undefined
}

export function initSocketServer(httpServer: HTTPServer): TypedServer {
  if (global.__socketServer) return global.__socketServer

  const io: TypedServer = new Server(httpServer, {
    cors: {
      origin:
        process.env.NODE_ENV === "production"
          ? process.env.NEXT_PUBLIC_APP_URL
          : ["http://localhost:3000"],
      credentials: true,
    },
  })

  setupSocketHandlers(io)
  global.__socketServer = io

  return io
}

export function getSocketServer(): TypedServer | null {
  return global.__socketServer ?? null
}
