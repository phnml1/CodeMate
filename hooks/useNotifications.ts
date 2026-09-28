"use client"

import { useEffect, useMemo, useRef } from "react"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import type { QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type {
  NotificationsResponse,
  NotificationSummaryResponse,
  NotificationFilterType,
  NotificationFilterRead,
} from "@/types/notification"

const NOTIFICATION_STALE_TIME_MS = 30_000
const NOTIFICATION_POLL_INTERVAL_MS = 10_000
const notificationSummaryQueryKey = ["notifications", "summary"] as const
const notificationListQueryKey = (
  type?: NotificationFilterType,
  read?: NotificationFilterRead
) => ["notifications", "list", type ?? "ALL", read ?? "all"] as const

type UseNotificationsOptions = {
  enabled?: boolean
}

async function fetchNotificationSummary(): Promise<NotificationSummaryResponse> {
  const res = await fetch("/api/notifications/summary")
  if (!res.ok) return { unreadCount: 0 }
  return res.json()
}

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

function patchNotificationLists(
  queryClient: QueryClient,
  updater: (old: NotificationsResponse) => NotificationsResponse
) {
  const listQueries = queryClient.getQueriesData<NotificationsResponse>({
    queryKey: ["notifications", "list"],
  })

  for (const [queryKey, old] of listQueries) {
    if (!old) continue
    queryClient.setQueryData<NotificationsResponse>(queryKey, updater(old))
  }
}

function showPollingNotificationToast() {
  toast("New notification", {
    description: "Open notifications to see the latest updates.",
    duration: 5000,
    action: {
      label: "View",
      onClick: () => {
        window.location.assign("/notifications")
      },
    },
  })
}

export function useNotificationSummary() {
  const previousUnreadCountRef = useRef<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: notificationSummaryQueryKey,
    queryFn: fetchNotificationSummary,
    staleTime: NOTIFICATION_STALE_TIME_MS,
    refetchInterval: NOTIFICATION_POLL_INTERVAL_MS,
  })

  useEffect(() => {
    if (!data) return

    const unreadCount = data.unreadCount
    const previousUnreadCount = previousUnreadCountRef.current
    previousUnreadCountRef.current = unreadCount

    if (previousUnreadCount == null) return
    if (unreadCount <= previousUnreadCount) return

    showPollingNotificationToast()
  }, [data])

  return {
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
  }
}

export function useNotifications(
  typeFilter?: NotificationFilterType,
  readFilter?: NotificationFilterRead,
  options: UseNotificationsOptions = {}
) {
  const queryClient = useQueryClient()
  const enabled = options.enabled ?? true

  const { data, isLoading } = useQuery({
    queryKey: notificationListQueryKey(typeFilter, readFilter),
    queryFn: () => fetchNotifications(typeFilter, readFilter),
    enabled,
    staleTime: NOTIFICATION_STALE_TIME_MS,
    refetchInterval: enabled ? NOTIFICATION_POLL_INTERVAL_MS : false,
  })

  const notifications = useMemo(() => data?.notifications ?? [], [data])
  const unreadCount = useMemo(() => data?.unreadCount ?? 0, [data])

  const { mutate: markAsRead } = useMutation({
    mutationFn: markAsReadApi,
    onMutate: async (ids?: string[]) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] })
      patchNotificationLists(queryClient, (old) => {
        const readCount = ids
          ? old.notifications.filter((n) => !n.isRead && ids.includes(n.id)).length
          : old.unreadCount

        return {
          ...old,
          notifications: old.notifications.map((n) =>
            !ids || ids.includes(n.id) ? { ...n, isRead: true } : n
          ),
          unreadCount: ids ? Math.max(0, old.unreadCount - readCount) : 0,
        }
      })
      queryClient.setQueryData<NotificationSummaryResponse>(
        notificationSummaryQueryKey,
        (old) => ({
          unreadCount: ids
            ? Math.max(0, (old?.unreadCount ?? 0) - ids.length)
            : 0,
        })
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
      let shouldDecrementUnread = false

      patchNotificationLists(queryClient, (old) => {
        const target = old.notifications.find((n) => n.id === id)
        if (target && !target.isRead) shouldDecrementUnread = true

        return {
          ...old,
          notifications: old.notifications.filter((n) => n.id !== id),
          unreadCount:
            target && !target.isRead
              ? Math.max(0, old.unreadCount - 1)
              : old.unreadCount,
          total: Math.max(0, old.total - 1),
        }
      })

      if (shouldDecrementUnread) {
        queryClient.setQueryData<NotificationSummaryResponse>(
          notificationSummaryQueryKey,
          (old) => ({
            unreadCount: Math.max(0, (old?.unreadCount ?? 0) - 1),
          })
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  return { notifications, unreadCount, isLoading, markAsRead, deleteNotification }
}
