import { getNotificationLink } from "@/lib/notification-link"
import type { Notification } from "@/types/notification"

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "notif-1",
    type: "NEW_REVIEW",
    title: "Test",
    message: null,
    isRead: false,
    userId: "user-1",
    prId: "pr-1",
    commentId: null,
    createdAt: new Date().toISOString(),
    prTitle: null,
    prNumber: null,
    repoFullName: null,
    ...overrides,
  }
}

describe("getNotificationLink", () => {
  it("prId가 없으면 null을 반환한다", () => {
    const link = getNotificationLink(makeNotification({ prId: null }))
    expect(link).toBeNull()
  })

  it("NEW_REVIEW 타입은 PR 상세 페이지로 이동한다", () => {
    const link = getNotificationLink(makeNotification({ type: "NEW_REVIEW" }))
    expect(link).toBe("/pulls/pr-1")
  })

  it("PR_MERGED 타입은 PR 상세 페이지로 이동한다", () => {
    const link = getNotificationLink(makeNotification({ type: "PR_MERGED" }))
    expect(link).toBe("/pulls/pr-1")
  })

  it("MENTION 타입은 commentId가 있으면 해시 포함 URL을 반환한다", () => {
    const link = getNotificationLink(
      makeNotification({ type: "MENTION", commentId: "comment-1" })
    )
    expect(link).toBe("/pulls/pr-1#comment-comment-1")
  })

  it("COMMENT_REPLY 타입은 commentId가 있으면 해시 포함 URL을 반환한다", () => {
    const link = getNotificationLink(
      makeNotification({ type: "COMMENT_REPLY", commentId: "comment-2" })
    )
    expect(link).toBe("/pulls/pr-1#comment-comment-2")
  })

  it("MENTION 타입이지만 commentId가 없으면 PR 페이지로 이동한다", () => {
    const link = getNotificationLink(
      makeNotification({ type: "MENTION", commentId: null })
    )
    expect(link).toBe("/pulls/pr-1")
  })
})
