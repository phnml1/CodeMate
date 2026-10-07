"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { io, type Socket as ClientSocket } from "socket.io-client"
import { useQueryClient } from "@tanstack/react-query"
import {
  appendCollaborationMessage,
  collaborationMessagesQueryKey,
} from "@/hooks/useCollaborationMessages"
import { collaborationCodeThreadsQueryKey } from "@/hooks/useCollaborationCodeThreads"
import { markCollaborationPerformance } from "@/lib/collaboration/client-performance"
import type {
  ClientToServerEvents,
  CollaborationHeartbeatAck,
  CollaborationJoinAck,
  CollaborationLocation,
  CollaborationLocationInput,
  CollaborationPresenceSnapshot,
  CollaborationTypingAnchor,
  CollaborationTypingEvent,
  ServerToClientEvents,
} from "@/lib/socket/types"
import type { CollaborationMessage, CollaborationSocketTokenResponse } from "@/types/collaboration"

type CollaborationClientSocket = ClientSocket<
  ServerToClientEvents,
  ClientToServerEvents
>

export type CollaborationSocketStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error"

const DEFAULT_SOCKET_URL = "http://localhost:4000"
const RECONNECT_DELAY_MS = 1_200
const TYPING_EXPIRY_MS = 4_000
const UNAVAILABLE_RETRY_DELAY_MS = 3_000

class CollaborationSocketUnavailableError extends Error {}

function getSocketUrl() {
  return (
    process.env.NEXT_PUBLIC_SOCKET_URL ??
    process.env.NEXT_PUBLIC_WS_URL ??
    DEFAULT_SOCKET_URL
  )
}

async function fetchRoomSocketToken(roomId: string) {
  markCollaborationPerformance("token.start")
  try {
    const response = await fetch(`/api/collaboration/rooms/${roomId}/socket-token`, {
      method: "POST",
    })

    if (!response.ok) {
      if (response.status === 503) {
        throw new CollaborationSocketUnavailableError("협업방 연결을 확인할 수 없습니다. 재연결 중입니다.")
      }
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null
      throw new Error(
        body?.error === "Room is full"
          ? "협업방 정원이 찼습니다."
          : body?.error ?? "협업방 연결 토큰을 발급받지 못했습니다."
      )
    }
    return (await response.json()) as CollaborationSocketTokenResponse
  } finally {
    markCollaborationPerformance("token.done")
  }
}

export function useCollaborationRoomSocket(onMessage?: (message: CollaborationMessage) => void) {
  const queryClient = useQueryClient()
  const socketRef = useRef<CollaborationClientSocket | null>(null)
  const lastSocketIdRef = useRef<string | null>(null)
  const roomIdRef = useRef<string | null>(null)
  const heartbeatTimerRef = useRef<number | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const joinRoomRef = useRef<(roomId: string) => Promise<void>>(async () => {})
  const manualDisconnectRef = useRef(false)
  const joinAttemptRef = useRef(0)
  const onMessageRef = useRef(onMessage)
  const typingTimersRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  const [status, setStatus] = useState<CollaborationSocketStatus>("idle")
  const [presence, setPresence] =
    useState<CollaborationPresenceSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)
  const [locations, setLocations] = useState<Record<string, CollaborationLocation>>({})
  const [typingUsers, setTypingUsers] = useState<Record<string, CollaborationTypingEvent>>({})

  const acceptPresence = useCallback((nextPresence: CollaborationPresenceSnapshot) => {
    setPresence((current) => {
      if (current?.roomId !== nextPresence.roomId || current.revision === undefined || nextPresence.revision === undefined) {
        return nextPresence
      }
      if (current.revision > nextPresence.revision) return current
      if (current.revision === nextPresence.revision && current.generatedAt > nextPresence.generatedAt) return current
      return nextPresence
    })
  }, [])

  const clearTypingUser = useCallback((userId: string) => {
    const timer = typingTimersRef.current.get(userId)
    if (timer) window.clearTimeout(timer)
    typingTimersRef.current.delete(userId)
    setTypingUsers((current) => {
      if (!current[userId]) return current
      const next = { ...current }
      delete next[userId]
      return next
    })
  }, [])

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      window.clearInterval(heartbeatTimerRef.current)
      heartbeatTimerRef.current = null
    }
  }, [])

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }, [])

  const scheduleReconnect = useCallback((roomId: string, delayMs = RECONNECT_DELAY_MS) => {
    if (manualDisconnectRef.current) return
    clearReconnectTimer()
    setStatus("reconnecting")
    reconnectTimerRef.current = window.setTimeout(() => {
      if (manualDisconnectRef.current) return
      void joinRoomRef.current(roomId).catch(() => {})
    }, delayMs)
  }, [clearReconnectTimer])

  const handleSocketUnavailable = useCallback((roomId: string) => {
    if (manualDisconnectRef.current || roomIdRef.current !== roomId) return
    setError("실시간 연결이 끊겼습니다. 재연결 중입니다.")
    socketRef.current?.disconnect()
    scheduleReconnect(roomId, UNAVAILABLE_RETRY_DELAY_MS)
  }, [scheduleReconnect])

  const sendHeartbeat = useCallback((roomId: string) => {
    const socket = socketRef.current
    if (!socket?.connected || manualDisconnectRef.current) return
    const joinAttempt = joinAttemptRef.current

    socket.emit(
      "collaboration:heartbeat",
      { roomId },
      (response: CollaborationHeartbeatAck) => {
        if (manualDisconnectRef.current || joinAttempt !== joinAttemptRef.current) return
        if (!response.ok) {
          if (response.error.code === "NOT_JOINED") {
            stopHeartbeat()
            void joinRoomRef.current(roomId).catch((nextError) => {
              if (manualDisconnectRef.current || joinAttempt !== joinAttemptRef.current) return
              setError(nextError.message)
            })
            return
          }
          if (response.error.code === "SERVICE_UNAVAILABLE") {
            stopHeartbeat()
            handleSocketUnavailable(roomId)
            return
          }
          setError(response.error.message)
          setStatus("error")
        }
      }
    )
  }, [handleSocketUnavailable, stopHeartbeat])

  const startHeartbeat = useCallback(
    (roomId: string, intervalMs: number) => {
      stopHeartbeat()
      heartbeatTimerRef.current = window.setInterval(
        () => sendHeartbeat(roomId),
        intervalMs
      )
    },
    [sendHeartbeat, stopHeartbeat]
  )

  const joinWithToken = useCallback(
    (
      roomId: string,
      tokenResponse: CollaborationSocketTokenResponse,
      resolve?: () => void,
      reject?: (error: Error) => void,
      isCurrent?: () => boolean
    ) => {
      const socket = socketRef.current
      if (!socket?.connected) {
        reject?.(new Error("소켓 서버에 연결하지 못했습니다."))
        return
      }

      markCollaborationPerformance("join.emit")
      socket.emit(
        "collaboration:join",
        { token: tokenResponse.token },
        (response: CollaborationJoinAck) => {
          markCollaborationPerformance("join.ack")
          if (isCurrent && !isCurrent()) {
            resolve?.()
            return
          }
          if (!response.ok) {
            const nextError =
              response.error.code === "ROOM_FULL"
                ? "협업방 정원이 찼습니다."
                : response.error.code === "SERVICE_UNAVAILABLE"
                ? "협업방 연결을 확인할 수 없습니다. 재연결 중입니다."
                : response.error.message
            const retry = response.error.code === "SERVICE_UNAVAILABLE"
            roomIdRef.current = retry ? roomId : null
            if (!retry) setActiveRoomId(null)
            setPresence(null)
            setLocations({})
            setError(nextError)
            if (retry) scheduleReconnect(roomId, UNAVAILABLE_RETRY_DELAY_MS)
            else setStatus("error")
            reject?.(new Error(nextError))
            return
          }

          roomIdRef.current = response.roomId
          setActiveRoomId(response.roomId)
          acceptPresence(response.presence)
          setLocations(Object.fromEntries(response.locations.map((location) => [location.userId, location])))
          for (const timer of typingTimersRef.current.values()) window.clearTimeout(timer)
          typingTimersRef.current.clear()
          setTypingUsers({})
          setStatus("connected")
          setError(null)
          startHeartbeat(roomId, response.heartbeatIntervalMs)
          void queryClient.invalidateQueries({
            queryKey: collaborationMessagesQueryKey(response.roomId),
          })
          void queryClient.invalidateQueries({
            queryKey: collaborationCodeThreadsQueryKey(response.roomId),
          })
          resolve?.()
        }
      )
    },
    [acceptPresence, queryClient, scheduleReconnect, startHeartbeat]
  )

  const joinRoom = useCallback(
    async (roomId: string) => {
      markCollaborationPerformance("join.start")
      const joinAttempt = ++joinAttemptRef.current
      const isCurrent = () =>
        joinAttempt === joinAttemptRef.current && !manualDisconnectRef.current
      clearReconnectTimer()
      manualDisconnectRef.current = false
      setStatus(roomIdRef.current ? "reconnecting" : "connecting")
      setError(null)

      let tokenResponse: CollaborationSocketTokenResponse
      try {
        tokenResponse = await fetchRoomSocketToken(roomId)
      } catch (nextError) {
        if (!isCurrent()) return
        setError(nextError instanceof Error ? nextError.message : "협업방에 연결하지 못했습니다.")
        if (nextError instanceof CollaborationSocketUnavailableError || nextError instanceof TypeError) {
          scheduleReconnect(roomId, UNAVAILABLE_RETRY_DELAY_MS)
        } else {
          setStatus("error")
        }
        throw nextError
      }
      if (!isCurrent()) return

      stopHeartbeat()
      const previousRoomId = roomIdRef.current
      if (previousRoomId && previousRoomId !== roomId && socketRef.current?.connected) {
        socketRef.current.emit("collaboration:leave", { roomId: previousRoomId })
      }
      roomIdRef.current = roomId
      if (previousRoomId !== roomId) {
        setActiveRoomId(null)
        setPresence(null)
        setLocations({})
      }
      const socketUrl = getSocketUrl()

      return new Promise<void>((resolve, reject) => {
        let socket = socketRef.current

        if (!socket) {
          const createdSocket = io(socketUrl, {
            auth: { token: tokenResponse.token },
            autoConnect: false,
            reconnection: false,
            transports: ["websocket"],
          }) as CollaborationClientSocket
          socket = createdSocket
          socketRef.current = socket

          socket.on("connect", () => {
            markCollaborationPerformance("socket.connected")
            lastSocketIdRef.current = createdSocket.id ?? null
          })

          socket.on("collaboration:presence", (nextPresence) => {
            if (nextPresence.roomId === roomIdRef.current) {
              acceptPresence(nextPresence)
            }
          })

          socket.on("collaboration:message", (message) => {
            if (message.roomId === roomIdRef.current) {
              appendCollaborationMessage(queryClient, message)
              clearTypingUser(message.authorId)
              onMessageRef.current?.(message)
            }
          })

          socket.on("collaboration:typing", (typing) => {
            if (typing.roomId !== roomIdRef.current) return
            clearTypingUser(typing.userId)
            if (!typing.isTyping) return
            setTypingUsers((current) => ({ ...current, [typing.userId]: typing }))
            typingTimersRef.current.set(typing.userId, window.setTimeout(
              () => clearTypingUser(typing.userId), TYPING_EXPIRY_MS
            ))
          })

          socket.on("collaboration:location", (location) => {
            if (location.roomId === roomIdRef.current) {
              setLocations((current) => ({ ...current, [location.userId]: location }))
            }
          })

          socket.on("collaboration:location:clear", ({ roomId, userId }) => {
            if (roomId === roomIdRef.current) {
              setLocations((current) => {
                const next = { ...current }
                delete next[userId]
                return next
              })
            }
          })

          socket.on("disconnect", () => {
            stopHeartbeat()
            for (const userId of typingTimersRef.current.keys()) clearTypingUser(userId)
            if (manualDisconnectRef.current) {
              setStatus("disconnected")
              return
            }

            setPresence(null)
            setLocations({})
            const reconnectRoomId = roomIdRef.current
            if (!reconnectRoomId) return
            scheduleReconnect(reconnectRoomId)
          })

          socket.on("connect_error", (connectError) => {
            if (manualDisconnectRef.current) return
            stopHeartbeat()
            setError(connectError.message)
            setStatus("reconnecting")
            const reconnectRoomId = roomIdRef.current
            if (!reconnectRoomId) return
            scheduleReconnect(reconnectRoomId)
          })
        }

        socket.auth = { token: tokenResponse.token }

        if (socket.connected) {
          joinWithToken(roomId, tokenResponse, resolve, reject, isCurrent)
          return
        }

        const onConnect = () => {
          socket.off("connect_error", onInitialConnectError)
          if (!isCurrent()) {
            resolve()
            return
          }
          joinWithToken(roomId, tokenResponse, resolve, reject, isCurrent)
        }
        const onInitialConnectError = (connectError: Error) => {
          socket.off("connect", onConnect)
          if (!isCurrent()) {
            resolve()
            return
          }
          reject(connectError)
        }
        socket.once("connect", onConnect)
        socket.once("connect_error", onInitialConnectError)

        markCollaborationPerformance("socket.connect.start")
        socket.connect()
      })
    },
    [acceptPresence, clearReconnectTimer, clearTypingUser, joinWithToken, queryClient, scheduleReconnect, stopHeartbeat]
  )

  useEffect(() => {
    joinRoomRef.current = joinRoom
  }, [joinRoom])

  const publishLocation = useCallback(
    (location: Omit<CollaborationLocationInput, "roomId">) => {
      const socket = socketRef.current
      const roomId = roomIdRef.current
      if (!socket?.connected || !roomId) return
      socket.emit("collaboration:location", { roomId, ...location }, (response) => {
        if (manualDisconnectRef.current || socketRef.current !== socket) return
        if (!response.ok) {
          if (response.error.code === "SERVICE_UNAVAILABLE") handleSocketUnavailable(roomId)
          else setError(response.error.message)
        }
      })
    },
    [handleSocketUnavailable]
  )

  const stopSharingLocation = useCallback(() => {
    const socket = socketRef.current
    const roomId = roomIdRef.current
    if (!socket?.connected || !roomId) return
    socket.emit("collaboration:location:stop", { roomId }, (response) => {
      if (manualDisconnectRef.current || socketRef.current !== socket) return
      if (!response.ok && response.error.code === "SERVICE_UNAVAILABLE") handleSocketUnavailable(roomId)
    })
  }, [handleSocketUnavailable])

  const publishTyping = useCallback((anchor: CollaborationTypingAnchor | null, isTyping: boolean) => {
    const socket = socketRef.current
    const roomId = roomIdRef.current
    if (!socket?.connected || !roomId) return
    socket.emit("collaboration:typing", { roomId, anchor, isTyping }, (response) => {
      if (manualDisconnectRef.current || socketRef.current !== socket) return
      if (!response.ok && response.error.code === "SERVICE_UNAVAILABLE") handleSocketUnavailable(roomId)
    })
  }, [handleSocketUnavailable])

  const sendLeaveBeacon = useCallback((roomId: string, socketId: string) => {
    const url = `/api/collaboration/rooms/${encodeURIComponent(roomId)}/leave`
    const body = JSON.stringify({ socketId })
    let sent = false
    try {
      sent = navigator.sendBeacon?.(url, new Blob([body], { type: "application/json" })) ?? false
    } catch {
      // A refused beacon must not interrupt navigation or socket cleanup.
    }
    if (!sent) {
      void fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {})
    }
  }, [])

  const disconnectForLeave = useCallback(() => {
    const socket = socketRef.current
    const roomId = roomIdRef.current
    const socketId = socket?.id ?? lastSocketIdRef.current

    joinAttemptRef.current++
    manualDisconnectRef.current = true
    clearReconnectTimer()
    stopHeartbeat()
    for (const timer of typingTimersRef.current.values()) window.clearTimeout(timer)
    typingTimersRef.current.clear()

    // Detach this connection before late callbacks or a new join can reuse it.
    roomIdRef.current = null
    lastSocketIdRef.current = null
    socketRef.current = null
    if (socket?.connected && roomId) {
      socket.emit("collaboration:leave", { roomId })
    }
    socket?.removeAllListeners()
    socket?.disconnect()
    return roomId && socketId ? { roomId, socketId } : null
  }, [clearReconnectTimer, stopHeartbeat])

  const leaveOnUnload = useCallback(() => {
    const connection = disconnectForLeave()
    if (connection) sendLeaveBeacon(connection.roomId, connection.socketId)
  }, [disconnectForLeave, sendLeaveBeacon])

  const leaveRoom = useCallback(() => {
    const connection = disconnectForLeave()
    setActiveRoomId(null)
    setPresence(null)
    setLocations({})
    setTypingUsers({})
    setError(null)
    setStatus("disconnected")

    if (!connection) return
    const { roomId, socketId } = connection
    // The request outlives the workspace; it must not update hook state on completion.
    void fetch(`/api/collaboration/rooms/${encodeURIComponent(roomId)}/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ socketId }),
      keepalive: true,
    }).then((response) => {
      if (!response.ok) sendLeaveBeacon(roomId, socketId)
    }).catch(() => sendLeaveBeacon(roomId, socketId))
  }, [disconnectForLeave, sendLeaveBeacon])

  useEffect(() => {
    const joinAttempt = joinAttemptRef
    const typingTimers = typingTimersRef.current
    return () => {
      joinAttempt.current++
      manualDisconnectRef.current = true
      clearReconnectTimer()
      stopHeartbeat()
      for (const timer of typingTimers.values()) window.clearTimeout(timer)
      typingTimers.clear()
      socketRef.current?.removeAllListeners()
      socketRef.current?.disconnect()
      socketRef.current = null
    }
  }, [clearReconnectTimer, stopHeartbeat])

  return {
    activeRoomId,
    error,
    joinRoom,
    leaveOnUnload,
    leaveRoom,
    locations,
    presence,
    publishLocation,
    publishTyping,
    stopSharingLocation,
    status,
    typingUsers,
  }
}
