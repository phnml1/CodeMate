import type {
  CommentWithAuthor,
  ReactionEmoji,
  Reactions,
} from "@/types/comment"

export function normalizeComment(comment: CommentWithAuthor): CommentWithAuthor {
  return {
    ...comment,
    author: {
      id: comment.author?.id || comment.authorId,
      name: comment.author?.name ?? null,
      image: comment.author?.image ?? null,
    },
    replies: Array.isArray(comment.replies)
      ? comment.replies.map(normalizeComment)
      : [],
  }
}

function mapCommentTree(
  comments: CommentWithAuthor[],
  updater: (comment: CommentWithAuthor) => CommentWithAuthor
): CommentWithAuthor[] {
  return comments.map((comment) => {
    const nextComment = updater(comment)
    const replies = Array.isArray(nextComment.replies) ? nextComment.replies : []

    if (replies.length === 0) return nextComment

    return {
      ...nextComment,
      replies: mapCommentTree(replies, updater),
    }
  })
}

export function appendCommentToThread(
  comments: CommentWithAuthor[],
  comment: CommentWithAuthor
): CommentWithAuthor[] {
  const normalizedComment = normalizeComment(comment)

  if (normalizedComment.parentId == null) {
    if (comments.some((item) => item.id === normalizedComment.id)) {
      return comments
    }

    return [...comments, normalizedComment]
  }

  return mapCommentTree(comments, (item) => {
    if (item.id !== normalizedComment.parentId) return item

    const replies = Array.isArray(item.replies) ? item.replies : []
    if (replies.some((reply) => reply.id === normalizedComment.id)) {
      return item
    }

    return {
      ...item,
      replies: [...replies, normalizedComment],
    }
  })
}

export function replaceCommentInThread(
  comments: CommentWithAuthor[],
  comment: CommentWithAuthor
): CommentWithAuthor[] {
  const normalizedComment = normalizeComment(comment)

  return mapCommentTree(comments, (item) =>
    item.id === normalizedComment.id
      ? {
          ...normalizedComment,
          replies:
            normalizedComment.replies.length > 0
              ? normalizedComment.replies
              : item.replies,
        }
      : item
  )
}

export function removeCommentFromThread(
  comments: CommentWithAuthor[],
  commentId: string
): CommentWithAuthor[] {
  return comments
    .filter((comment) => comment.id !== commentId)
    .map((comment) => ({
      ...comment,
      replies: removeCommentFromThread(comment.replies ?? [], commentId),
    }))
}

export function updateCommentReactionsInThread(
  comments: CommentWithAuthor[],
  commentId: string,
  reactions: Reactions
): CommentWithAuthor[] {
  return mapCommentTree(comments, (comment) =>
    comment.id === commentId
      ? {
          ...comment,
          reactions,
        }
      : comment
  )
}

export function findCommentInThread(
  comments: CommentWithAuthor[],
  commentId: string
): CommentWithAuthor | null {
  for (const comment of comments) {
    if (comment.id === commentId) return comment

    const replies = Array.isArray(comment.replies) ? comment.replies : []
    if (replies.length === 0) continue

    const nested = findCommentInThread(replies, commentId)
    if (nested) return nested
  }

  return null
}

export function toggleReactionForUser(
  reactions: Reactions,
  emoji: ReactionEmoji,
  userId: string
): Reactions {
  const currentUsers = reactions[emoji] ?? []
  const nextUsers = currentUsers.includes(userId)
    ? currentUsers.filter((id) => id !== userId)
    : [...currentUsers, userId]

  return {
    ...reactions,
    [emoji]: nextUsers,
  }
}
