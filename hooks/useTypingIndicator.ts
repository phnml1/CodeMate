"use client"

import { useEffect, useRef, useState } from "react"
import { useSocket } from "./useSocket"

export function useTypingIndicator(prId: string) {
  const socket = useSocket()
  const [typingUsers, setTypingUsers] = useState<{ userId: string; userName: string }[]>([])
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!socket || !prId) return

    // 타이핑 시작 이벤트
    const handleTypingStart = (data: { userId: string; userName: string }) => {
      setTypingUsers((prev) => {
        // 중복 제거
        const exists = prev.some((u) => u.userId === data.userId)
        return exists ? prev : [...prev, data]
      })
    }

    // 타이핑 종료 이벤트
    const handleTypingStop = (data: { userId: string }) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId))
    }

    socket.on("typing:start", handleTypingStart)
    socket.on("typing:stop", handleTypingStop)

    return () => {
      socket.off("typing:start", handleTypingStart)
      socket.off("typing:stop", handleTypingStop)
    }
  }, [socket, prId])

  const onTypingStart = () => {
    if (!socket || !prId) return

    // 2초 디바운스로 typing:stop 전송
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    socket.emit("typing:start", prId)

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing:stop", prId)
    }, 2000)
  }

  const onTypingStop = () => {
    if (!socket || !prId) return

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    socket.emit("typing:stop", prId)
  }

  return {
    names: typingUsers.map((u) => u.userName),
    onTypingStart,
    onTypingStop,
  }
}
