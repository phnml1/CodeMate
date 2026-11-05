import type { BaseNotification } from "@/types/notification"

function eventKey(notification: BaseNotification) {
  return `${notification.id}:${notification.reviewStatus ?? ""}:${notification.createdAt}`
}

export function getNewNotificationEvents(
  previous: BaseNotification[] | null,
  current: BaseNotification[]
): BaseNotification[] {
  if (!previous) return []

  const seen = new Set(previous.map(eventKey))
  const newestPreviousTime = Math.max(
    0,
    ...previous.map((notification) => Date.parse(notification.createdAt) || 0)
  )

  return current
    .filter(
      (notification) =>
        !seen.has(eventKey(notification)) &&
        Date.parse(notification.createdAt) >= newestPreviousTime
    )
    .sort(
      (left, right) =>
        Date.parse(left.createdAt) - Date.parse(right.createdAt)
    )
}
