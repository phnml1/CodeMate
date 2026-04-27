"use client"

import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { UseQueryOptions } from "@tanstack/react-query"
import { useSocket } from "./useSocket"
import type { Review } from "@/types/review"
import type { BaseNotification } from "@/types/notification"
import {
  recordHandlerInvocation,
  recordHandlerRegistered,
  recordHandlerRemoved,
} from "@/lib/measurements/socketMetrics"

export const reviewQueryKey = (prId: string) => ["review", prId] as const
type ReviewQueryKey = ReturnType<typeof reviewQueryKey>
type ReviewQueryOptions = Omit<
  UseQueryOptions<Review | null, Error, Review | null, ReviewQueryKey>,
  "queryKey" | "queryFn"
>

async function fetchReview(prId: string): Promise<Review | null> {
  const res = await fetch(`/api/pulls/${prId}/review`)
  if (!res.ok) throw new Error("리뷰 데이터를 불러오는 데 실패했습니다.")
  return res.json()
}

export function useReviewQuery(prId: string, options?: ReviewQueryOptions) {
  return useQuery({
    queryKey: reviewQueryKey(prId),
    queryFn: () => fetchReview(prId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === "PENDING" || status === "IN_PROGRESS") return 3000
      return false
    },
    ...options,
  })
}

export function useReview(prId: string) {
  const { socket } = useSocket()
  const queryClient = useQueryClient()

  // Socket: NEW_REVIEW 알림 수신 시 즉시 refetch
  useEffect(() => {
    if (!socket) return

    const handleNotification = (notification: BaseNotification) => {
      recordHandlerInvocation("notification:new")
      if (
        (notification.type === "NEW_REVIEW" ||
          notification.type === "REVIEW_FAILED") &&
        notification.prId === prId
      ) {
        queryClient.invalidateQueries({ queryKey: reviewQueryKey(prId) })
      }
    }

    recordHandlerRegistered("notification:new")
    socket.on("notification:new", handleNotification)
    return () => {
      socket.off("notification:new", handleNotification)
      recordHandlerRemoved("notification:new")
    }
  }, [socket, prId, queryClient])

  return useReviewQuery(prId)
}
