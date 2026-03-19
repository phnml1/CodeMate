"use client"

import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSocket } from "./useSocket"
import type { Review } from "@/types/review"
import type { Notification } from "@/types/notification"

async function fetchReview(prId: string): Promise<Review | null> {
  const res = await fetch(`/api/pulls/${prId}/review`)
  if (!res.ok) throw new Error("리뷰 데이터를 불러오는 데 실패했습니다.")
  return res.json()
}

export function useReview(prId: string) {
  const { socket } = useSocket()
  const queryClient = useQueryClient()

  // Socket: NEW_REVIEW 알림 수신 시 즉시 refetch
  useEffect(() => {
    if (!socket) return

    const handleNotification = (notification: Notification) => {
      if (notification.type === "NEW_REVIEW" && notification.prId === prId) {
        queryClient.invalidateQueries({ queryKey: ["review", prId] })
      }
    }

    socket.on("notification:new", handleNotification)
    return () => {
      socket.off("notification:new", handleNotification)
    }
  }, [socket, prId, queryClient])

  return useQuery({
    queryKey: ["review", prId],
    queryFn: () => fetchReview(prId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === "PENDING" || status === "IN_PROGRESS") return 3000
      return false
    },
  })
}
