import { Server as HTTPServer } from "http"
import { Server } from "socket.io"
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "./types"
import { setupSocketHandlers } from "./handlers"

declare global {
  // eslint-disable-next-line no-var
  var __socketServer: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | undefined
}

let io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | null = null

export function initSocketServer(httpServer: HTTPServer) {
  if (io) {
    return io
  }

  if (global.__socketServer) {
    io = global.__socketServer
    return io
  }

  io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
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

export function getSocketServer() {
  return io
}
