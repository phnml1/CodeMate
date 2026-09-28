"use client"

import { useQuery } from "@tanstack/react-query"
import type { UseQueryOptions } from "@tanstack/react-query"
import type { Review } from "@/types/review"

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

export function useReview(prId: string) {
  return useReviewQuery(prId)
}
