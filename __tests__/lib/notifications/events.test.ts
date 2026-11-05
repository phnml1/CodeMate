import { getNewNotificationEvents } from "@/lib/notifications/events"
import type { BaseNotification } from "@/types/notification"

function notification(overrides: Partial<BaseNotification> = {}): BaseNotification {
  return {
    id: "review-notification",
    type: "NEW_REVIEW",
    reviewStatus: "PENDING",
    title: "AI 리뷰 진행 중",
    message: null,
    isRead: false,
    userId: "user-1",
    prId: "pr-1",
    commentId: null,
    createdAt: "2026-11-05T00:00:00.000Z",
    ...overrides,
  }
}

describe("getNewNotificationEvents", () => {
  it("does not toast existing notifications on the first load", () => {
    expect(getNewNotificationEvents(null, [notification()])).toEqual([])
  })

  it.each(["COMPLETED", "FAILED"] as const)(
    "detects a %s update on the same notification even when the count is unchanged",
    (reviewStatus) => {
      const pending = notification()
      const updated = notification({
        reviewStatus,
        createdAt: "2026-11-05T00:00:05.000Z",
      })

      expect(getNewNotificationEvents([pending], [updated])).toEqual([updated])
      expect(getNewNotificationEvents([updated], [updated])).toEqual([])
    }
  )

  it("ignores older notifications that enter the recent window", () => {
    const newest = notification({ createdAt: "2026-11-05T00:00:10.000Z" })
    const older = notification({ id: "older", createdAt: "2026-11-05T00:00:01.000Z" })

    expect(getNewNotificationEvents([newest], [newest, older])).toEqual([])
  })
})
