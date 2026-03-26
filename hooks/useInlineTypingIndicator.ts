"use client"

import { useEffect, useRef, useCallback, useState, useMemo } from "react"
import { useSocket } from "./useSocket"

const TYPING_TIMEOUT = 1000;

interface InlineTypingUser {
  userId: string
  userName: string
  filePath: string
  lineNumber: number
}

export function useInlineTypingIndicator(prId: string) {
  const { socket } = useSocket()
  const [typingUsers, setTypingUsers] = useState<Map<string, InlineTypingUser>>(new Map())
  const isTypingRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── 수신 ──────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !prId) return

    const handleStart = (data: InlineTypingUser) => {
      setTypingUsers((prev) => {
        const next = new Map(prev)
        next.set(data.userId, data)
        return next
      })
    }

    const handleStop = ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => {
        if (!prev.has(userId)) return prev
        const next = new Map(prev)
        next.delete(userId)
        return next
      })
    }

    socket.on("inline:typing:start", handleStart)
    socket.on("inline:typing:stop", handleStop)

    return () => {
      socket.off("inline:typing:start", handleStart)
      socket.off("inline:typing:stop", handleStop)
      setTypingUsers(new Map())
    }
  }, [socket, prId])

  // ── 발신 ──────────────────────────────────────────────
  const onInlineTyping = useCallback(
    (filePath: string, lineNumber: number) => {
      if (!socket || !prId) return

      if (!isTypingRef.current) {
        isTypingRef.current = true
        socket.emit("inline:typing:start", { prId, filePath, lineNumber })
      }

      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        isTypingRef.current = false
        socket.emit("inline:typing:stop", prId)
      }, TYPING_TIMEOUT)
    },
    [socket, prId]
  )

  const onInlineTypingStop = useCallback(() => {
    if (!socket || !prId) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (isTypingRef.current) {
      isTypingRef.current = false
      socket.emit("inline:typing:stop", prId)
    }
  }, [socket, prId])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (isTypingRef.current && socket && prId) {
        socket.emit("inline:typing:stop", prId)
      }
    }
  }, [socket, prId])

  // "filePath:lineNumber" → 타이핑 중인 유저 이름 목록
  const typingByLine = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const user of typingUsers.values()) {
      const key = `${user.filePath}:${user.lineNumber}`
      const list = map.get(key) ?? []
      list.push(user.userName)
      map.set(key, list)
    }
    return map
  }, [typingUsers])

  // 전체 인라인 타이핑 목록 (채팅 섹션 표시용)
  const allInlineTyping = useMemo(() => Array.from(typingUsers.values()), [typingUsers])

  return { typingByLine, allInlineTyping, onInlineTyping, onInlineTypingStop }
}
