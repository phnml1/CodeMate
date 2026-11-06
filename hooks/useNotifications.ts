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
  BaseNotification,
} from "@/types/notification"
import { getNewNotificationEvents } from "@/lib/notifications/events"
import { getNotificationLink } from "@/lib/notification-link"

const NOTIFICATION_STALE_TIME_MS = 30_000
const NOTIFICATION_POLL_INTERVAL_MS = 5_000
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
  if (!res.ok) throw new Error("알림 정보를 불러오지 못했습니다.")
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

function showNotificationToast(notification: BaseNotification) {
  if (notification.type === "NEW_REVIEW" && notification.reviewStatus === "PENDING") {
    return
  }

  const isReviewComplete =
    notification.type === "NEW_REVIEW" && notification.reviewStatus === "COMPLETED"
  const isReviewFailed =
    notification.type === "REVIEW_FAILED" ||
    (notification.type === "NEW_REVIEW" && notification.reviewStatus === "FAILED")
  const title = isReviewComplete
    ? "AI 리뷰 완료"
    : isReviewFailed
      ? "AI 리뷰 실패"
      : notification.title
  const link = getNotificationLink(notification) ?? "/notifications"
  const options = {
    description: notification.message ?? undefined,
    duration: 5000,
    action: {
      label: isReviewComplete ? "결과 보기" : "확인하기",
      onClick: () => window.location.assign(link),
    },
  }

  if (isReviewComplete) toast.success(title, options)
  else if (isReviewFailed) toast.error(title, options)
  else toast(title, options)
}

export function useNotificationSummary(options: UseNotificationsOptions = {}) {
  const enabled = options.enabled ?? true
  const previousNotificationsRef = useRef<BaseNotification[] | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: notificationSummaryQueryKey,
    queryFn: fetchNotificationSummary,
    enabled,
    staleTime: NOTIFICATION_STALE_TIME_MS,
    refetchInterval: enabled ? NOTIFICATION_POLL_INTERVAL_MS : false,
  })

  useEffect(() => {
    if (!enabled) {
      previousNotificationsRef.current = null
      return
    }
    if (!data) return

    const recentNotifications = data.recentNotifications ?? []
    const newEvents = getNewNotificationEvents(
      previousNotificationsRef.current,
      recentNotifications
    )
    previousNotificationsRef.current = recentNotifications
    newEvents.forEach(showNotificationToast)
  }, [data, enabled])

  return {
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
  }
}

export function useNotificationSummaryCount() {
  const { data } = useQuery({
    queryKey: notificationSummaryQueryKey,
    queryFn: fetchNotificationSummary,
    enabled: false,
  })

  return data?.unreadCount ?? 0
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
        (old) =>
          old
            ? {
                ...old,
                unreadCount: ids ? Math.max(0, old.unreadCount - ids.length) : 0,
              }
            : old
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
          (old) =>
            old
              ? {
                  ...old,
                  unreadCount: Math.max(0, old.unreadCount - 1),
                }
              : old
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  return { notifications, unreadCount, isLoading, markAsRead, deleteNotification }
}
