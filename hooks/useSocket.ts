"use client"

import { useEffect, useSyncExternalStore } from "react"
import { io } from "socket.io-client"
import type { TypedClientSocket } from "@/lib/socket/types"

export type SocketConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error"

let socket: TypedClientSocket | null = null
let connected = false
let connecting = false
let status: SocketConnectionStatus = "idle"
let lastError: string | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSocketSnapshot() {
  return socket
}

function getConnectedSnapshot() {
  return connected
}

function getStatusSnapshot() {
  return status
}

function getErrorSnapshot() {
  return lastError
}

function getServerSocketSnapshot(): null {
  return null
}

function getServerConnectedSnapshot(): false {
  return false as const
}

function getServerStatusSnapshot(): SocketConnectionStatus {
  return "idle"
}

function getServerErrorSnapshot(): null {
  return null
}

function setConnectionState(
  nextStatus: SocketConnectionStatus,
  options?: {
    connected?: boolean
    connecting?: boolean
    error?: string | null
  }
) {
  status = nextStatus

  if (typeof options?.connected === "boolean") {
    connected = options.connected
  }

  if (typeof options?.connecting === "boolean") {
    connecting = options.connecting
  }

  if ("error" in (options ?? {})) {
    lastError = options?.error ?? null
  }

  notify()
}

async function connect() {
  if (process.env.NEXT_PUBLIC_REALTIME_MODE !== "socket") {
    setConnectionState("idle", {
      connected: false,
      connecting: false,
      error: null,
    })
    return
  }

  if (socket) {
    if (!socket.connected && !connecting) {
      setConnectionState("reconnecting", {
        connected: false,
        connecting: true,
        error: null,
      })
      socket.connect()
    }
    return
  }

  if (connecting) return

  setConnectionState("connecting", {
    connected: false,
    connecting: true,
    error: null,
  })

  try {
    const res = await fetch("/api/socket/token")
    if (!res.ok) {
      setConnectionState("error", {
        connected: false,
        connecting: false,
        error: "소켓 인증 토큰을 가져오지 못했습니다.",
      })
      return
    }

    const { token } = await res.json()

    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000", {
      path: "/socket.io",
      transports: ["websocket"],
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    })

    socket.on("connect", () => {
      setConnectionState("connected", {
        connected: true,
        connecting: false,
        error: null,
      })
    })

    socket.on("disconnect", (reason) => {
      const nextStatus =
        reason === "io client disconnect" ? "disconnected" : "reconnecting"

      setConnectionState(nextStatus, {
        connected: false,
        connecting: nextStatus === "reconnecting",
        error: null,
      })
    })

    socket.on("connect_error", (error) => {
      const shouldRetry = socket?.active ?? false

      setConnectionState(shouldRetry ? "reconnecting" : "error", {
        connected: false,
        connecting: shouldRetry,
        error: error.message,
      })
    })

    notify()
  } catch {
    setConnectionState("error", {
      connected: false,
      connecting: false,
      error: "소켓 연결 초기화 중 오류가 발생했습니다.",
    })
  }
}

export function useSocket() {
  useEffect(() => {
    connect()
  }, [])

  const currentSocket = useSyncExternalStore(
    subscribe,
    getSocketSnapshot,
    getServerSocketSnapshot
  )
  const isConnected = useSyncExternalStore(
    subscribe,
    getConnectedSnapshot,
    getServerConnectedSnapshot
  )
  const connectionStatus = useSyncExternalStore(
    subscribe,
    getStatusSnapshot,
    getServerStatusSnapshot
  )
  const connectionError = useSyncExternalStore(
    subscribe,
    getErrorSnapshot,
    getServerErrorSnapshot
  )

  return {
    socket: currentSocket,
    isConnected,
    connectionStatus,
    connectionError,
  }
}
