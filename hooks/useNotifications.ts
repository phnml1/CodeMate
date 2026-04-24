"use client"

import { useEffect, useCallback, useMemo, useRef } from "react"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { useSocket } from "./useSocket"
import type {
  BaseNotification,
  Notification,
  NotificationsResponse,
  NotificationFilterType,
  NotificationFilterRead,
} from "@/types/notification"
import {
  recordHandlerInvocation,
  recordHandlerRegistered,
  recordHandlerRemoved,
} from "@/lib/measurements/socketMetrics"

const toastedNotificationIds = new Set<string>()

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

export function useNotifications(
  typeFilter?: NotificationFilterType,
  readFilter?: NotificationFilterRead
) {
  const { socket, fallbackActive, realtimeEnabled } = useSocket()
  const queryClient = useQueryClient()
  const previousFallbackRef = useRef(fallbackActive)

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", typeFilter, readFilter],
    queryFn: () => fetchNotifications(typeFilter, readFilter),
    refetchInterval: realtimeEnabled && !fallbackActive ? false : 10_000,
  })

  const notifications = useMemo(() => data?.notifications ?? [], [data])
  const unreadCount = useMemo(() => data?.unreadCount ?? 0, [data])

  const handleNew = useCallback(
    (base: BaseNotification) => {
      recordHandlerInvocation("notification:new")

      if (!toastedNotificationIds.has(base.id)) {
        toastedNotificationIds.add(base.id)
        showNotificationToast(base)
      }

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

      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
    [queryClient, typeFilter, readFilter]
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
