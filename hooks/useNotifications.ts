"use client"

import { useEffect, useCallback, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSocket } from "./useSocket"
import type { NotificationPayload } from "@/lib/socket/types"

const isSocketMode = process.env.NEXT_PUBLIC_REALTIME_MODE === "socket"

async function fetchNotifications(): Promise<NotificationPayload[]> {
  const res = await fetch("/api/notifications")
  if (!res.ok) return []
  const data = await res.json()
  return data.notifications ?? []
}

export function useNotifications() {
  const { socket } = useSocket()
  const queryClient = useQueryClient()

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: isSocketMode ? false : 10_000,
  })

  const handleNew = useCallback(
    (notification: NotificationPayload) => {
      queryClient.setQueryData<NotificationPayload[]>(
        ["notifications"],
        (old) => (old ? [notification, ...old] : [notification])
      )
    },
    [queryClient]
  )

  useEffect(() => {
    if (!socket) return

    socket.on("notification:new", handleNew)
    return () => {
      socket.off("notification:new", handleNew)
    }
  }, [socket, handleNew])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  )

  return { notifications, unreadCount, isLoading }
}
