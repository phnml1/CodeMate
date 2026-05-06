"use client"

import { useEffect, useSyncExternalStore } from "react"
import type { TypedClientSocket } from "@/lib/socket/types"
import {
  recordSocketConnectCall,
  recordSocketConnectError,
  recordSocketConnected,
  recordSocketCreate,
  recordSocketDisconnected,
} from "@/lib/measurements/socketMetrics"

export type SocketConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error"

export const SOCKET_FALLBACK_GRACE_MS = 8_000

const realtimeEnabled = process.env.NEXT_PUBLIC_REALTIME_MODE === "socket"

let socket: TypedClientSocket | null = null
let connected = false
let connecting = false
let fallbackActive = !realtimeEnabled
let status: SocketConnectionStatus = "idle"
let lastError: string | null = null
let fallbackTimer: number | null = null
let socketAttemptBlocked = false
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

function getFallbackSnapshot() {
  return fallbackActive
}

function getRealtimeEnabledSnapshot() {
  return realtimeEnabled
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

function getServerFallbackSnapshot() {
  return !realtimeEnabled
}

function getServerRealtimeEnabledSnapshot() {
  return realtimeEnabled
}

function clearFallbackTimer() {
  if (fallbackTimer == null) return

  window.clearTimeout(fallbackTimer)
  fallbackTimer = null
}

function stopSocketConnection() {
  if (!socket) return

  const currentSocket = socket
  socket = null
  currentSocket.removeAllListeners()
  currentSocket.disconnect()
}

function activatePollingFallback() {
  clearFallbackTimer()
  socketAttemptBlocked = true
  fallbackActive = true
  connected = false
  connecting = false
  stopSocketConnection()
  notify()
}

function scheduleFallbackActivation() {
  if (!realtimeEnabled || fallbackActive || fallbackTimer != null) return

  fallbackTimer = window.setTimeout(() => {
    fallbackTimer = null
    activatePollingFallback()
  }, SOCKET_FALLBACK_GRACE_MS)
}

function syncFallbackState(nextStatus: SocketConnectionStatus) {
  if (!realtimeEnabled) {
    clearFallbackTimer()
    fallbackActive = true
    return
  }

  if (
    nextStatus === "connected" ||
    nextStatus === "connecting" ||
    nextStatus === "idle"
  ) {
    clearFallbackTimer()
    fallbackActive = false
    return
  }

  scheduleFallbackActivation()
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

  syncFallbackState(nextStatus)
  notify()
}

async function connect() {
  recordSocketConnectCall()

  if (!realtimeEnabled) {
    setConnectionState("idle", {
      connected: false,
      connecting: false,
      error: null,
    })
    return
  }

  if (socketAttemptBlocked) {
    fallbackActive = true
    connected = false
    connecting = false
    notify()
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
        error: "Failed to fetch a socket auth token.",
      })
      return
    }

    const { token } = await res.json()
    const { io } = await import("socket.io-client")

    recordSocketCreate()
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
      recordSocketConnected()
      setConnectionState("connected", {
        connected: true,
        connecting: false,
        error: null,
      })
    })

    socket.on("disconnect", (reason) => {
      recordSocketDisconnected()
      const nextStatus =
        reason === "io client disconnect" ? "disconnected" : "reconnecting"

      setConnectionState(nextStatus, {
        connected: false,
        connecting: nextStatus === "reconnecting",
        error: null,
      })
    })

    socket.on("connect_error", (error) => {
      recordSocketConnectError(error.message)
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
      error: "Failed to initialize the socket connection.",
    })
  }
}

export function useSocketState() {
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
  const currentFallbackActive = useSyncExternalStore(
    subscribe,
    getFallbackSnapshot,
    getServerFallbackSnapshot
  )
  const currentRealtimeEnabled = useSyncExternalStore(
    subscribe,
    getRealtimeEnabledSnapshot,
    getServerRealtimeEnabledSnapshot
  )

  return {
    socket: currentSocket,
    isConnected,
    connectionStatus,
    connectionError,
    fallbackActive: currentFallbackActive,
    realtimeEnabled: currentRealtimeEnabled,
    degraded: currentRealtimeEnabled && currentFallbackActive,
  }
}

export function useEnsureSocketConnection() {
  useEffect(() => {
    if (!realtimeEnabled) return

    void connect()
  }, [])
}

export function useSocket() {
  useEnsureSocketConnection()
  return useSocketState()
}
