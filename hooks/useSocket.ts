"use client"

import { useEffect, useRef, useState } from "react"
import { io, Socket } from "socket.io-client"
import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/socket/types"

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null)

  useEffect(() => {
    // 소켓 모드가 아니면 반환
    if (typeof window === "undefined" || process.env.NEXT_PUBLIC_REALTIME_MODE !== "socket") {
      return
    }

    // 이미 연결됐으면 기존 소켓 사용
    if (socket && socket.connected) {
      socketRef.current = socket
      setIsConnected(true)
      return
    }

    // 새 소켓 연결
    socket = io({
      path: "/socket.io",
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    })

    socket.on("connect", () => {
      console.log("[Socket] Connected")
      setIsConnected(true)
    })

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected")
      setIsConnected(false)
    })

    socket.on("connect_error", (error) => {
      console.error("[Socket] Connection error:", error)
    })

    socketRef.current = socket

    return () => {
      // cleanup은 하지 않음 (싱글톤 유지)
    }
  }, [])

  return socketRef.current
}
