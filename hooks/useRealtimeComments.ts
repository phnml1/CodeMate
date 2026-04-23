"use client"

import { useCallback, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  appendCommentToThread,
  normalizeComment,
  removeCommentFromThread,
  replaceCommentInThread,
  updateCommentReactionsInThread,
} from "@/lib/comments/cache"
import type { CommentWithAuthor } from "@/types/comment"
import {
  recordHandlerInvocation,
  recordHandlerRegistered,
  recordHandlerRemoved,
} from "@/lib/measurements/socketMetrics"
import { useSocketRoom } from "./useSocketRoom"

async function fetchComments(prId: string): Promise<CommentWithAuthor[]> {
  const res = await fetch(`/api/pulls/${prId}/comments`)
  if (!res.ok) throw new Error("Failed to load comments.")
  const data = await res.json()
  return (data.comments as CommentWithAuthor[]).map(normalizeComment)
}

const isSocketMode = process.env.NEXT_PUBLIC_REALTIME_MODE === "socket"

export function useRealtimeComments(prId: string) {
  const socket = useSocketRoom(prId)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["comments", prId],
    queryFn: () => fetchComments(prId),
    refetchInterval: isSocketMode ? false : 10_000,
  })

  const handleNew = useCallback(
    (comment: CommentWithAuthor) => {
      recordHandlerInvocation("comment:new")
      queryClient.setQueryData<CommentWithAuthor[]>(["comments", prId], (old) =>
        old ? appendCommentToThread(old, comment) : [normalizeComment(comment)]
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

        return replaceCommentInThread(old, normalizedComment)
      })
    },
    [queryClient, prId]
  )

  const handleDeleted = useCallback(
    ({ commentId }: { commentId: string; prId: string }) => {
      recordHandlerInvocation("comment:deleted")
      queryClient.setQueryData<CommentWithAuthor[]>(["comments", prId], (old) =>
        old ? removeCommentFromThread(old, commentId) : []
      )
    },
    [queryClient, prId]
  )

  const handleReactionUpdated = useCallback(
    ({
      commentId,
      reactions,
    }: {
      commentId: string
      prId: string
      reactions: CommentWithAuthor["reactions"]
    }) => {
      recordHandlerInvocation("comment:reaction-updated")
      queryClient.setQueryData<CommentWithAuthor[]>(["comments", prId], (old) =>
        old ? updateCommentReactionsInThread(old, commentId, reactions) : old
      )
    },
    [queryClient, prId]
  )

  useEffect(() => {
    if (!socket) return

    recordHandlerRegistered("comment:new")
    recordHandlerRegistered("comment:updated")
    recordHandlerRegistered("comment:deleted")
    recordHandlerRegistered("comment:reaction-updated")
    socket.on("comment:new", handleNew)
    socket.on("comment:updated", handleUpdated)
    socket.on("comment:deleted", handleDeleted)
    socket.on("comment:reaction-updated", handleReactionUpdated)

    return () => {
      socket.off("comment:new", handleNew)
      socket.off("comment:updated", handleUpdated)
      socket.off("comment:deleted", handleDeleted)
      socket.off("comment:reaction-updated", handleReactionUpdated)
      recordHandlerRemoved("comment:new")
      recordHandlerRemoved("comment:updated")
      recordHandlerRemoved("comment:deleted")
      recordHandlerRemoved("comment:reaction-updated")
    }
  }, [socket, handleDeleted, handleNew, handleReactionUpdated, handleUpdated])

  return query
}
