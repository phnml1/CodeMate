import {
  findCommentInThread,
  normalizeComment,
  toggleReactionForUser,
  updateCommentReactionsInThread,
} from "@/lib/comments/cache"
import type { CommentWithAuthor } from "@/types/comment"

function makeComment(
  overrides: Partial<CommentWithAuthor> = {}
): CommentWithAuthor {
  return {
    id: overrides.id ?? "comment-1",
    content: overrides.content ?? "hello",
    lineNumber: overrides.lineNumber ?? null,
    filePath: overrides.filePath ?? null,
    isResolved: overrides.isResolved ?? false,
    pullRequestId: overrides.pullRequestId ?? "pr-1",
    authorId: overrides.authorId ?? "user-1",
    parentId: overrides.parentId ?? null,
    mentions: overrides.mentions ?? [],
    reactions: overrides.reactions ?? {},
    createdAt: overrides.createdAt ?? "2024-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2024-01-01T00:00:00.000Z",
    author: overrides.author ?? {
      id: overrides.authorId ?? "user-1",
      name: "Tester",
      image: null,
    },
    replies: overrides.replies ?? [],
  }
}

describe("lib/comments/cache", () => {
  it("normalizes missing author fields recursively", () => {
    const normalized = normalizeComment(
      makeComment({
        author: {
          id: "",
          name: null,
          image: null,
        },
        replies: [
          makeComment({
            id: "reply-1",
            parentId: "comment-1",
            authorId: "user-2",
            author: {
              id: "",
              name: null,
              image: null,
            },
          }),
        ],
      })
    )

    expect(normalized.author.id).toBe("user-1")
    expect(normalized.replies[0].author.id).toBe("user-2")
  })

  it("finds nested comments in the thread", () => {
    const comments = [
      makeComment({
        id: "comment-1",
        replies: [
          makeComment({
            id: "reply-1",
            parentId: "comment-1",
          }),
        ],
      }),
    ]

    expect(findCommentInThread(comments, "reply-1")?.id).toBe("reply-1")
    expect(findCommentInThread(comments, "missing")).toBeNull()
  })

  it("toggles reaction membership for the current user", () => {
    const added = toggleReactionForUser({ "👍": ["user-2"] }, "👍", "user-1")
    expect(added["👍"]).toEqual(["user-2", "user-1"])

    const removed = toggleReactionForUser(added, "👍", "user-1")
    expect(removed["👍"]).toEqual(["user-2"])
  })

  it("patches reactions for nested replies without touching siblings", () => {
    const comments = [
      makeComment({
        id: "comment-1",
        reactions: { "👍": ["user-1"] },
        replies: [
          makeComment({
            id: "reply-1",
            parentId: "comment-1",
            reactions: { "👀": ["user-2"] },
          }),
          makeComment({
            id: "reply-2",
            parentId: "comment-1",
            reactions: { "🚀": ["user-3"] },
          }),
        ],
      }),
    ]

    const updated = updateCommentReactionsInThread(comments, "reply-1", {
      "👀": ["user-2", "user-1"],
    })

    expect(updated[0].reactions).toEqual({ "👍": ["user-1"] })
    expect(updated[0].replies[0].reactions).toEqual({ "👀": ["user-2", "user-1"] })
    expect(updated[0].replies[1].reactions).toEqual({ "🚀": ["user-3"] })
  })
})
