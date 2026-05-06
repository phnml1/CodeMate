"use client"

import { useEffect, useCallback, useMemo, useRef } from "react"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import type { QueryClient, QueryKey } from "@tanstack/react-query"
import { toast } from "sonner"
import { useSocket, useSocketState } from "./useSocket"
import type {
  BaseNotification,
  Notification,
  NotificationsResponse,
  NotificationSummaryResponse,
  NotificationFilterType,
  NotificationFilterRead,
} from "@/types/notification"
import {
  recordHandlerInvocation,
  recordHandlerRegistered,
  recordHandlerRemoved,
} from "@/lib/measurements/socketMetrics"

const toastedNotificationIds = new Set<string>()
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

function toListNotification(base: BaseNotification): Notification {
  return {
    ...base,
    prTitle: base.prTitle ?? null,
    prNumber: base.prNumber ?? null,
    repoFullName: base.repoFullName ?? null,
  }
}

function notificationMatchesFilters(
  notification: Notification,
  type?: NotificationFilterType,
  read?: NotificationFilterRead
) {
  if (type && type !== "ALL" && notification.type !== type) return false
  if (read === "unread" && notification.isRead) return false
  if (read === "read" && !notification.isRead) return false
  return true
}

function getListFilters(queryKey: QueryKey) {
  const key = queryKey as readonly unknown[]
  return {
    type: key[2] as NotificationFilterType | undefined,
    read: key[3] as NotificationFilterRead | undefined,
  }
}

function updateExistingNotificationLists(
  queryClient: QueryClient,
  notification: Notification
) {
  const listQueries = queryClient.getQueriesData<NotificationsResponse>({
    queryKey: ["notifications", "list"],
  })

  for (const [queryKey, old] of listQueries) {
    if (!old) continue

    const { type, read } = getListFilters(queryKey)
    if (!notificationMatchesFilters(notification, type, read)) continue
    if (old.notifications.some((item) => item.id === notification.id)) continue

    queryClient.setQueryData<NotificationsResponse>(queryKey, {
      notifications: [notification, ...old.notifications],
      unreadCount: old.unreadCount + (notification.isRead ? 0 : 1),
      total: old.total + 1,
    })
  }
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

function getToastMessage(notification: BaseNotification) {
  const prTitle =
    notification.prTitle && notification.prTitle.trim().length > 0
      ? notification.prTitle
      : null

  if (notification.type === "NEW_REVIEW") {
    return {
      title: prTitle ? `AI review is ready for "${prTitle}"` : "AI review is ready",
      description: notification.message ?? "Open the PR to review the result.",
      kind: "success" as const,
    }
  }

  if (notification.type === "REVIEW_FAILED") {
    return {
      title: "AI review failed",
      description: notification.message ?? "The review process hit an error.",
      kind: "error" as const,
    }
  }

  return {
    title: notification.title,
    description: notification.message ?? "You have a new notification.",
    kind: "default" as const,
  }
}

function showNotificationToast(notification: BaseNotification) {
  const toastContent = getToastMessage(notification)
  const action =
    notification.prId &&
    (notification.type === "NEW_REVIEW" ||
      notification.type === "REVIEW_FAILED")
      ? {
          label: "Open PR",
          onClick: () => {
            window.location.assign(`/pulls/${notification.prId}?review=open`)
          },
        }
      : undefined

  if (toastContent.kind === "success") {
    toast.success(toastContent.title, {
      description: toastContent.description,
      duration: 5000,
      action,
    })
    return
  }

  if (toastContent.kind === "error") {
    toast.error(toastContent.title, {
      description: toastContent.description,
      duration: 5000,
      action,
    })
    return
  }

  toast(toastContent.title, {
    description: toastContent.description,
    duration: 5000,
    action,
  })
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
  const { socket, fallbackActive, realtimeEnabled } = useSocket()
  const queryClient = useQueryClient()
  const previousFallbackRef = useRef(fallbackActive)
  const previousUnreadCountRef = useRef<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: notificationSummaryQueryKey,
    queryFn: fetchNotificationSummary,
    staleTime: NOTIFICATION_STALE_TIME_MS,
    refetchInterval:
      realtimeEnabled && !fallbackActive ? false : NOTIFICATION_POLL_INTERVAL_MS,
  })

  const handleNew = useCallback(
    (base: BaseNotification) => {
      recordHandlerInvocation("notification:new")

      if (!toastedNotificationIds.has(base.id)) {
        toastedNotificationIds.add(base.id)
        showNotificationToast(base)
      }

      const notification = toListNotification(base)

      queryClient.setQueryData<NotificationSummaryResponse>(
        notificationSummaryQueryKey,
        (old) => ({ unreadCount: (old?.unreadCount ?? 0) + 1 })
      )
      updateExistingNotificationLists(queryClient, notification)
    },
    [queryClient]
  )

  useEffect(() => {
    if (!socket) return

    recordHandlerRegistered("notification:new")
    socket.on("notification:new", handleNew)
    return () => {
      socket.off("notification:new", handleNew)
      recordHandlerRemoved("notification:new")
    }
  }, [socket, handleNew])

  useEffect(() => {
    if (previousFallbackRef.current && !fallbackActive) {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] })
    }

    previousFallbackRef.current = fallbackActive
  }, [fallbackActive, queryClient])

  useEffect(() => {
    if (!data) return

    const unreadCount = data.unreadCount
    const previousUnreadCount = previousUnreadCountRef.current
    previousUnreadCountRef.current = unreadCount

    if (previousUnreadCount == null) return
    if (realtimeEnabled && !fallbackActive) return
    if (unreadCount <= previousUnreadCount) return

    showPollingNotificationToast()
  }, [data, fallbackActive, realtimeEnabled])

  return {
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
    fallbackActive,
    realtimeEnabled,
  }
}

export function useNotifications(
  typeFilter?: NotificationFilterType,
  readFilter?: NotificationFilterRead,
  options: UseNotificationsOptions = {}
) {
  const { fallbackActive, realtimeEnabled } = useSocketState()
  const queryClient = useQueryClient()
  const enabled = options.enabled ?? true

  const { data, isLoading } = useQuery({
    queryKey: notificationListQueryKey(typeFilter, readFilter),
    queryFn: () => fetchNotifications(typeFilter, readFilter),
    enabled,
    staleTime: NOTIFICATION_STALE_TIME_MS,
    refetchInterval: enabled
      ? realtimeEnabled && !fallbackActive
        ? false
        : NOTIFICATION_POLL_INTERVAL_MS
      : false,
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
