"use client"

import { useEffect, useState } from "react"
import { useSocket } from "./useSocket"
import type { NotificationPayload } from "@/lib/socket/types"

async function fetchNotifications(): Promise<NotificationPayload[]> {
  const res = await fetch("/api/notifications")
  if (!res.ok) return []
  const data = await res.json()
  return data.notifications || []
}

export function useNotifications() {
  const socket = useSocket()
  const [notifications, setNotifications] = useState<NotificationPayload[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 초기 로드
  useEffect(() => {
    fetchNotifications()
      .then(setNotifications)
      .finally(() => setIsLoading(false))
  }, [])

  // 소켓 이벤트 또는 폴링
  useEffect(() => {
    if (socket) {
      // 소켓 모드
      const handleNewNotification = (notification: NotificationPayload) => {
        setNotifications((prev) => [notification, ...prev])
      }

      socket.on("notification:new", handleNewNotification)

      return () => {
        socket.off("notification:new", handleNewNotification)
      }
    } else {
      // 폴링 모드
      const interval = setInterval(() => {
        fetchNotifications().then(setNotifications)
      }, 10_000)

      return () => clearInterval(interval)
    }
  }, [socket])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return {
    notifications,
    unreadCount,
    isLoading,
  }
}
