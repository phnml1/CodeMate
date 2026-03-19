"use client"

import { useEffect, useCallback, useMemo } from "react"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { useSocket } from "./useSocket"
import type { BaseNotification, Notification, NotificationsResponse, NotificationFilterType, NotificationFilterRead } from "@/types/notification"

const isSocketMode = process.env.NEXT_PUBLIC_REALTIME_MODE === "socket"

async function fetchNotifications(
  type?: NotificationFilterType,
  read?: NotificationFilterRead
): Promise<NotificationsResponse> {
  const params = new URLSearchParams()
  if (type && type !== "ALL") params.set("type", type)
  if (read === "unread") params.set("read", "false")
  else if (read === "read") params.set("read", "true")

  const res = await fetch(`/api/notifications?${params.toString()}`)
  if (!res.ok) return { notifications: [], unreadCount: 0, total: 0 }
  return res.json()
}

async function markAsReadApi(ids?: string[]): Promise<void> {
  await fetch("/api/notifications/read", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ids ? { ids } : {}),
  })
}

async function deleteNotificationApi(id: string): Promise<void> {
  await fetch(`/api/notifications/${id}`, { method: "DELETE" })
}

export function useNotifications(
  typeFilter?: NotificationFilterType,
  readFilter?: NotificationFilterRead
) {
  const { socket } = useSocket()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", typeFilter, readFilter],
    queryFn: () => fetchNotifications(typeFilter, readFilter),
    refetchInterval: isSocketMode ? false : 10_000,
  })

  const notifications = useMemo(() => data?.notifications ?? [], [data])
  const unreadCount = useMemo(() => data?.unreadCount ?? 0, [data])

  const handleNew = useCallback(
    (base: BaseNotification) => {
      // 소켓에서 받은 BaseNotification을 Notification으로 확장
      const notification: Notification = {
        ...base,
        prTitle: null,
        prNumber: null,
        repoFullName: null,
      }
      queryClient.setQueryData<NotificationsResponse>(
        ["notifications", typeFilter, readFilter],
        (old) => {
          if (!old) return { notifications: [notification], unreadCount: 1, total: 1 }
          return {
            notifications: [notification, ...old.notifications],
            unreadCount: old.unreadCount + 1,
            total: old.total + 1,
          }
        }
      )
      // 전체 데이터를 다시 가져와서 PR 상세 정보 포함
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
    [queryClient, typeFilter, readFilter]
  )

  useEffect(() => {
    if (!socket) return

    socket.on("notification:new", handleNew)
    return () => {
      socket.off("notification:new", handleNew)
    }
  }, [socket, handleNew])

  const { mutate: markAsRead } = useMutation({
    mutationFn: markAsReadApi,
    onMutate: async (ids?: string[]) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] })
      queryClient.setQueryData<NotificationsResponse>(
        ["notifications", typeFilter, readFilter],
        (old) => {
          if (!old) return old
          return {
            ...old,
            notifications: old.notifications.map((n) =>
              !ids || ids.includes(n.id) ? { ...n, isRead: true } : n
            ),
            unreadCount: ids
              ? old.unreadCount - old.notifications.filter((n) => !n.isRead && ids.includes(n.id)).length
              : 0,
          }
        }
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const { mutate: deleteNotification } = useMutation({
    mutationFn: deleteNotificationApi,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] })
      queryClient.setQueryData<NotificationsResponse>(
        ["notifications", typeFilter, readFilter],
        (old) => {
          if (!old) return old
          const target = old.notifications.find((n) => n.id === id)
          return {
            ...old,
            notifications: old.notifications.filter((n) => n.id !== id),
            unreadCount: target && !target.isRead ? old.unreadCount - 1 : old.unreadCount,
            total: old.total - 1,
          }
        }
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  return { notifications, unreadCount, isLoading, markAsRead, deleteNotification }
}
