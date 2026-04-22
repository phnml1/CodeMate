import { getNotificationLink } from "@/lib/notification-link"
import type { Notification } from "@/types/notification"

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "notif-1",
    type: "NEW_REVIEW",
    reviewStatus: "COMPLETED",
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
  it("returns null when prId is missing", () => {
    const link = getNotificationLink(makeNotification({ prId: null }))
    expect(link).toBeNull()
  })

  it("routes NEW_REVIEW to the PR detail review panel", () => {
    const link = getNotificationLink(makeNotification({ type: "NEW_REVIEW" }))
    expect(link).toBe("/pulls/pr-1?review=open")
  })

  it("routes REVIEW_FAILED to the PR detail review panel", () => {
    const link = getNotificationLink(makeNotification({ type: "REVIEW_FAILED" }))
    expect(link).toBe("/pulls/pr-1?review=open")
  })

  it("routes PR_MERGED to the PR detail page", () => {
    const link = getNotificationLink(makeNotification({ type: "PR_MERGED" }))
    expect(link).toBe("/pulls/pr-1")
  })

  it("keeps comment anchors for MENTION with commentId", () => {
    const link = getNotificationLink(
      makeNotification({ type: "MENTION", commentId: "comment-1" })
    )
    expect(link).toBe("/pulls/pr-1#comment-comment-1")
  })

  it("keeps comment anchors for COMMENT_REPLY with commentId", () => {
    const link = getNotificationLink(
      makeNotification({ type: "COMMENT_REPLY", commentId: "comment-2" })
    )
    expect(link).toBe("/pulls/pr-1#comment-comment-2")
  })

  it("routes MENTION without commentId to the PR detail page", () => {
    const link = getNotificationLink(
      makeNotification({ type: "MENTION", commentId: null })
    )
    expect(link).toBe("/pulls/pr-1")
  })
})
