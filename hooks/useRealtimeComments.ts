"use client"

import { useCallback, useEffect, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { CommentWithAuthor } from "@/types/comment"
import {
  recordHandlerInvocation,
  recordHandlerRegistered,
  recordHandlerRemoved,
} from "@/lib/measurements/socketMetrics"
import { useSocket } from "./useSocket"
import { useSocketRoom } from "./useSocketRoom"

function normalizeComment(comment: CommentWithAuthor): CommentWithAuthor {
  return {
    ...comment,
    author: {
      id: comment.author?.id ?? comment.authorId,
      name: comment.author?.name ?? null,
      image: comment.author?.image ?? null,
    },
    replies: Array.isArray(comment.replies) ? comment.replies.map(normalizeComment) : [],
  }
}

async function fetchComments(prId: string): Promise<CommentWithAuthor[]> {
  const res = await fetch(`/api/pulls/${prId}/comments`)
  if (!res.ok) throw new Error("Failed to load comments.")
  const data = await res.json()
  return (data.comments as CommentWithAuthor[]).map(normalizeComment)
}

function appendComment(
  comments: CommentWithAuthor[],
  comment: CommentWithAuthor
): CommentWithAuthor[] {
  const normalizedComment = normalizeComment(comment)

  if (normalizedComment.parentId == null) {
    if (comments.some((item) => item.id === normalizedComment.id)) return comments
    return [...comments, normalizedComment]
  }

  return comments.map((item) => {
    const replies = Array.isArray(item.replies) ? item.replies : []

    if (item.id === normalizedComment.parentId) {
      if (replies.some((reply) => reply.id === normalizedComment.id)) return item
      return { ...item, replies: [...replies, normalizedComment] }
    }

    if (replies.length === 0) return item
    return { ...item, replies: appendComment(replies, normalizedComment) }
  })
}

export function useRealtimeComments(prId: string) {
  const socket = useSocketRoom(prId)
  const { fallbackActive, realtimeEnabled } = useSocket()
  const queryClient = useQueryClient()
  const previousFallbackRef = useRef(fallbackActive)

  const query = useQuery({
    queryKey: ["comments", prId],
    queryFn: () => fetchComments(prId),
    refetchInterval: realtimeEnabled && !fallbackActive ? false : 10_000,
  })

  const handleNew = useCallback(
    (comment: CommentWithAuthor) => {
      recordHandlerInvocation("comment:new")
      queryClient.setQueryData<CommentWithAuthor[]>(["comments", prId], (old) =>
        old ? appendComment(old, comment) : [normalizeComment(comment)]
      )
    },
    [queryClient, prId]
  )

  const handleUpdated = useCallback(
    (comment: CommentWithAuthor) => {
      recordHandlerInvocation("comment:updated")
      queryClient.setQueryData<CommentWithAuthor[]>(["comments", prId], (old) => {
        const normalizedComment = normalizeComment(comment)
        if (!old) return [normalizedComment]

        return old.map((item) => {
          if (item.id === normalizedComment.id) return normalizedComment

          const replies = Array.isArray(item.replies) ? item.replies : []
          if (replies.length === 0) return item

          return {
            ...item,
            replies: replies.map((reply) =>
              reply.id === normalizedComment.id ? normalizedComment : reply
            ),
          }
        })
      })
    },
    [queryClient, prId]
  )

  const handleDeleted = useCallback(
    ({ commentId }: { commentId: string; prId: string }) => {
      recordHandlerInvocation("comment:deleted")
      queryClient.setQueryData<CommentWithAuthor[]>(["comments", prId], (old) =>
        old
          ? old
              .filter((item) => item.id !== commentId)
              .map((item) => ({
                ...item,
                replies: (item.replies ?? []).filter((reply) => reply.id !== commentId),
              }))
          : []
      )
    },
    [queryClient, prId]
  )

  useEffect(() => {
    if (!socket) return

    recordHandlerRegistered("comment:new")
    recordHandlerRegistered("comment:updated")
    recordHandlerRegistered("comment:deleted")
    socket.on("comment:new", handleNew)
    socket.on("comment:updated", handleUpdated)
    socket.on("comment:deleted", handleDeleted)

    return () => {
      socket.off("comment:new", handleNew)
      socket.off("comment:updated", handleUpdated)
      socket.off("comment:deleted", handleDeleted)
      recordHandlerRemoved("comment:new")
      recordHandlerRemoved("comment:updated")
      recordHandlerRemoved("comment:deleted")
    }
  }, [socket, handleDeleted, handleNew, handleUpdated])

  useEffect(() => {
    if (previousFallbackRef.current && !fallbackActive) {
      void query.refetch()
    }

    previousFallbackRef.current = fallbackActive
  }, [fallbackActive, query])

  return query
}
