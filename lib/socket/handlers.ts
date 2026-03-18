import { Server } from "socket.io"
import { auth } from "@/lib/auth"
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "./types"

export function setupSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
) {
  io.on("connection", async (socket) => {
    try {
      // 요청 헤더에서 쿠키 추출 (Socket.io 핸드셰이크)
      const cookies = socket.handshake.headers.cookie

      // 세션 인증 (쿠키에서 세션 검증)
      const session = await auth()

      if (!session?.user?.id) {
        socket.disconnect(true)
        return
      }

      // 소켓 데이터 설정
      socket.data.userId = session.user.id
      socket.data.userName = session.user.name || "Unknown"
      socket.data.email = session.user.email || ""

      // 사용자 전용 room 조인
      socket.join(`user:${session.user.id}`)

      console.log(`[Socket] User connected: ${session.user.id} (${session.user.name})`)

      // Room 조인 이벤트
      socket.on("room:join", (prId: string) => {
        socket.join(`pr:${prId}`)
        console.log(`[Socket] User ${session.user.id} joined room pr:${prId}`)
      })

      // Room 나가기 이벤트
      socket.on("room:leave", (prId: string) => {
        socket.leave(`pr:${prId}`)
        console.log(`[Socket] User ${session.user.id} left room pr:${prId}`)
      })

      // 타이핑 시작 이벤트
      socket.on("typing:start", (prId: string) => {
        socket.to(`pr:${prId}`).emit("typing:start", {
          userId: session.user.id,
          userName: session.user.name || "Unknown",
        })
      })

      // 타이핑 종료 이벤트
      socket.on("typing:stop", (prId: string) => {
        socket.to(`pr:${prId}`).emit("typing:stop", {
          userId: session.user.id,
        })
      })

      // 연결 해제 이벤트
      socket.on("disconnect", () => {
        console.log(`[Socket] User disconnected: ${session.user.id}`)
      })
    } catch (error) {
      console.error("[Socket] Authentication failed:", error)
      socket.disconnect(true)
    }
  })
}
