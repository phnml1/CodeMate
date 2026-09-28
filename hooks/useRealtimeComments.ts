"use client"

import { useQuery } from "@tanstack/react-query"
import { normalizeComment } from "@/lib/comments/cache"
import type { CommentWithAuthor } from "@/types/comment"

const COMMENTS_POLL_INTERVAL_MS = 10_000

async function fetchComments(prId: string): Promise<CommentWithAuthor[]> {
  const res = await fetch(`/api/pulls/${prId}/comments`)
  if (!res.ok) throw new Error("Failed to load comments.")
  const data = await res.json()
  return (data.comments as CommentWithAuthor[]).map(normalizeComment)
}

export function useRealtimeComments(prId: string) {
  return useQuery({
    queryKey: ["comments", prId],
    queryFn: () => fetchComments(prId),
    refetchInterval: COMMENTS_POLL_INTERVAL_MS,
  })
}
