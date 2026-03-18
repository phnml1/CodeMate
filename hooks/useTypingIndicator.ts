"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { useSocket } from "./useSocket"

const TYPING_TIMEOUT = 2_000

export function useTypingIndicator(prId: string) {
  const { socket } = useSocket()
  const [typingUsers, setTypingUsers] = useState<
    Map<string, string>
  >(new Map())

  const isTypingRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── 수신: 다른 사용자의 타이핑 상태 ──────────────────
  useEffect(() => {
    if (!socket || !prId) return

    const handleStart = (data: { userId: string; userName: string }) => {
      setTypingUsers((prev) => {
        if (prev.get(data.userId) === data.userName) return prev
        const next = new Map(prev)
        next.set(data.userId, data.userName)
        return next
      })
    }

    const handleStop = (data: { userId: string }) => {
      setTypingUsers((prev) => {
        if (!prev.has(data.userId)) return prev
        const next = new Map(prev)
        next.delete(data.userId)
        return next
      })
    }

    socket.on("typing:start", handleStart)
    socket.on("typing:stop", handleStop)

    return () => {
      socket.off("typing:start", handleStart)
      socket.off("typing:stop", handleStop)
      setTypingUsers(new Map())
    }
  }, [socket, prId])

  // ── 발신: 내가 타이핑 중임을 알림 ────────────────────
  const onTyping = useCallback(() => {
    if (!socket || !prId) return

    if (!isTypingRef.current) {
      isTypingRef.current = true
      socket.emit("typing:start", prId)
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    timeoutRef.current = setTimeout(() => {
      isTypingRef.current = false
      socket.emit("typing:stop", prId)
    }, TYPING_TIMEOUT)
  }, [socket, prId])

  const onTypingStop = useCallback(() => {
    if (!socket || !prId) return

    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    if (isTypingRef.current) {
      isTypingRef.current = false
      socket.emit("typing:stop", prId)
    }
  }, [socket, prId])

  // 언마운트 시 타이머 정리 + typing:stop 전송
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (isTypingRef.current && socket && prId) {
        socket.emit("typing:stop", prId)
      }
    }
  }, [socket, prId])

  const names = useMemo(
    () => Array.from(typingUsers.values()),
    [typingUsers]
  )

  return { names, onTyping, onTypingStop }
}
