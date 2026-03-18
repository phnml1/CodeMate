"use client"

import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { CommentWithAuthor } from "@/types/comment"
import { useSocket } from "./useSocket"

async function fetchComments(prId: string): Promise<CommentWithAuthor[]> {
  const res = await fetch(`/api/pulls/${prId}/comments`)
  if (!res.ok) throw new Error("댓글을 불러오지 못했습니다.")
  const data = await res.json()
  return data.comments
}

export function useRealtimeComments(prId: string) {
  const socket = useSocket()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["comments", prId],
    queryFn: () => fetchComments(prId),
    refetchInterval:
      process.env.NEXT_PUBLIC_REALTIME_MODE === "socket" ? false : 10_000,
  })

  useEffect(() => {
    if (!socket || !prId) return

    // Room 조인
    socket.emit("room:join", prId)

    // 댓글 생성 이벤트
    const handleCommentNew = (comment: CommentWithAuthor) => {
      queryClient.setQueryData(["comments", prId], (old: CommentWithAuthor[] | undefined) => {
        return old ? [...old, comment] : [comment]
      })
    }

    // 댓글 수정 이벤트
    const handleCommentUpdated = (comment: CommentWithAuthor) => {
      queryClient.setQueryData(["comments", prId], (old: CommentWithAuthor[] | undefined) => {
        if (!old) return [comment]
        return old.map((c) => (c.id === comment.id ? comment : c))
      })
    }

    // 댓글 삭제 이벤트
    const handleCommentDeleted = (commentId: string) => {
      queryClient.setQueryData(["comments", prId], (old: CommentWithAuthor[] | undefined) => {
        if (!old) return []
        return old.filter((c) => c.id !== commentId)
      })
    }

    socket.on("comment:new", handleCommentNew)
    socket.on("comment:updated", handleCommentUpdated)
    socket.on("comment:deleted", handleCommentDeleted)

    return () => {
      socket.off("comment:new", handleCommentNew)
      socket.off("comment:updated", handleCommentUpdated)
      socket.off("comment:deleted", handleCommentDeleted)
      socket.emit("room:leave", prId)
    }
  }, [socket, prId, queryClient])

  return query
}
