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

class ReviewError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ReviewError"
    this.status = status
  }
}

async function fetchReview(prId: string): Promise<Review | null> {
  const res = await fetch(`/api/pulls/${prId}/review`)

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: string }
      | null

    throw new ReviewError(
      body?.error ?? "리뷰 데이터를 불러오지 못했습니다.",
      res.status
    )
  }

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
    retry: false,
    staleTime: 30_000,
    ...options,
  })
}

export function useReviewRealtimeInvalidation(prId: string) {
  const { socket } = useSocket()
  const queryClient = useQueryClient()

  // Socket: refetch review data when a review notification arrives.
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
}

export function useReview(prId: string) {
  return useReviewQuery(prId)
}
