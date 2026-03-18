"use client"

import { useEffect, useCallback, useMemo } from "react"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { useSocket } from "./useSocket"
import type { Notification, NotificationsResponse } from "@/types/notification"

const isSocketMode = process.env.NEXT_PUBLIC_REALTIME_MODE === "socket"

async function fetchNotifications(): Promise<Notification[]> {
  const res = await fetch("/api/notifications")
  if (!res.ok) return []
  const data: NotificationsResponse = await res.json()
  return data.notifications ?? []
}

async function markAsReadApi(ids?: string[]): Promise<void> {
  await fetch("/api/notifications/read", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ids ? { ids } : {}),
  })
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
    (notification: Notification) => {
      queryClient.setQueryData<Notification[]>(
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

  const { mutate: markAsRead } = useMutation({
    mutationFn: markAsReadApi,
    onMutate: async (ids?: string[]) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] })
      queryClient.setQueryData<Notification[]>(
        ["notifications"],
        (old) =>
          old?.map((n) =>
            !ids || ids.includes(n.id) ? { ...n, isRead: true } : n
          ) ?? []
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  return { notifications, unreadCount, isLoading, markAsRead }
}
