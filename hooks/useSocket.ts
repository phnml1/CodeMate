"use client"

import { useEffect, useSyncExternalStore } from "react"
import { io } from "socket.io-client"
import type { TypedClientSocket } from "@/lib/socket/types"

// ── 외부 스토어 (모든 컴포넌트가 동일한 스냅샷을 구독) ────────────
let socket: TypedClientSocket | null = null
let connected = false
let connecting = false
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((l) => l())
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

function getServerSnapshot(): null {
  return null
}

function getServerConnectedSnapshot(): false {
  return false as const
}

async function connect() {
  if (socket || connecting) return
  if (process.env.NEXT_PUBLIC_REALTIME_MODE !== "socket") return

  connecting = true

  try {
    const res = await fetch("/api/socket/token")
    if (!res.ok) {
      connecting = false
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
      connected = true
      notify()
    })

    socket.on("disconnect", () => {
      connected = false
      notify()
    })

    notify()
  } catch {
    connecting = false
  }
}

// ── Hook ────────────────────────────────────────────────
export function useSocket() {
  useEffect(() => {
    connect()
  }, [])

  const s = useSyncExternalStore(
    subscribe,
    getSocketSnapshot,
    getServerSnapshot
  )
  const isConnected = useSyncExternalStore(
    subscribe,
    getConnectedSnapshot,
    getServerConnectedSnapshot
  )

  return { socket: s, isConnected }
}
