"use client"

import { useEffect, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { CommentWithAuthor } from "@/types/comment"
import { useSocketRoom } from "./useSocketRoom"

async function fetchComments(prId: string): Promise<CommentWithAuthor[]> {
  const res = await fetch(`/api/pulls/${prId}/comments`)
  if (!res.ok) throw new Error("댓글을 불러오지 못했습니다.")
  const data = await res.json()
  return data.comments
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
      queryClient.setQueryData<CommentWithAuthor[]>(
        ["comments", prId],
        (old) => (old ? [...old, comment] : [comment])
      )
    },
    [queryClient, prId]
  )

  const handleUpdated = useCallback(
    (comment: CommentWithAuthor) => {
      queryClient.setQueryData<CommentWithAuthor[]>(
        ["comments", prId],
        (old) => {
          if (!old) return [comment]
          return old.map((c) => (c.id === comment.id ? comment : c))
        }
      )
    },
    [queryClient, prId]
  )

  const handleDeleted = useCallback(
    ({ commentId }: { commentId: string; prId: string }) => {
      queryClient.setQueryData<CommentWithAuthor[]>(
        ["comments", prId],
        (old) => (old ? old.filter((c) => c.id !== commentId) : [])
      )
    },
    [queryClient, prId]
  )

  useEffect(() => {
    if (!socket) return

    socket.on("comment:new", handleNew)
    socket.on("comment:updated", handleUpdated)
    socket.on("comment:deleted", handleDeleted)

    return () => {
      socket.off("comment:new", handleNew)
      socket.off("comment:updated", handleUpdated)
      socket.off("comment:deleted", handleDeleted)
    }
  }, [socket, handleNew, handleUpdated, handleDeleted])

  return query
}
