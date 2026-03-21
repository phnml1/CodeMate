import type { TypedServer, TypedServerSocket } from "./types"
import { authenticateSocket } from "./auth"

function registerRoomHandlers(socket: TypedServerSocket) {
  socket.on("room:join", (prId) => {
    socket.join(`pr:${prId}`)
  })

  socket.on("room:leave", (prId) => {
    socket.leave(`pr:${prId}`)
  })
}

function registerTypingHandlers(socket: TypedServerSocket) {
  const { userId, userName } = socket.data

  socket.on("typing:start", (prId) => {
    socket.to(`pr:${prId}`).emit("typing:start", { userId, userName })
  })

  socket.on("typing:stop", (prId) => {
    socket.to(`pr:${prId}`).emit("typing:stop", { userId })
  })

  socket.on("inline:typing:start", ({ prId, filePath, lineNumber }) => {
    socket.to(`pr:${prId}`).emit("inline:typing:start", { userId, userName, filePath, lineNumber })
  })

  socket.on("inline:typing:stop", (prId) => {
    socket.to(`pr:${prId}`).emit("inline:typing:stop", { userId })
  })
}

export function setupSocketHandlers(io: TypedServer) {
  io.on("connection", async (socket) => {
    const userData = await authenticateSocket(socket)

    if (!userData) {
      socket.disconnect(true)
      return
    }

    socket.data.userId = userData.userId
    socket.data.userName = userData.userName

    socket.join(`user:${userData.userId}`)

    registerRoomHandlers(socket)
    registerTypingHandlers(socket)
  })
}
