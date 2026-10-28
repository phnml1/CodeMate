"use client"

import { useQuery } from "@tanstack/react-query"
import type { CollaborationReviewMessagesResponse } from "@/types/collaboration"

const MESSAGE_POLL_INTERVAL_MS = 4_000
const CONNECTED_MESSAGE_POLL_INTERVAL_MS = 20_000

export const collaborationReviewMessagesQueryKey = (
  roomId: string,
  reviewId?: string
) => reviewId
  ? ["collaborationReviewMessages", roomId, reviewId] as const
  : ["collaborationReviewMessages", roomId] as const

export function useCollaborationReviewMessages(
  roomId: string,
  reviewId: string | null,
  realtimeConnected: boolean
) {
  return useQuery({
    queryKey: collaborationReviewMessagesQueryKey(roomId, reviewId ?? undefined),
    queryFn: async (): Promise<CollaborationReviewMessagesResponse> => {
      const params = new URLSearchParams({ reviewId: reviewId! })
      const response = await fetch(
        `/api/collaboration/rooms/${roomId}/review-threads?${params}`
      )
      if (!response.ok) {
        throw new Error("AI 리뷰 대화를 불러오지 못했습니다.")
      }
      return response.json()
    },
    enabled: Boolean(reviewId),
    refetchInterval: reviewId
      ? realtimeConnected
        ? CONNECTED_MESSAGE_POLL_INTERVAL_MS
        : MESSAGE_POLL_INTERVAL_MS
      : false,
  })
}
