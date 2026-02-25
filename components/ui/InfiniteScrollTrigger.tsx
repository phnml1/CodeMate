"use client"

import { useEffect, useRef, type ReactNode } from "react"

interface InfiniteScrollTriggerProps {
  onLoadMore: () => void
  hasNextPage: boolean | undefined
  isFetchingNextPage: boolean
  loadingFallback?: ReactNode
}

export function InfiniteScrollTrigger({
  onLoadMore,
  hasNextPage,
  isFetchingNextPage,
  loadingFallback,
}: InfiniteScrollTriggerProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          onLoadMore()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [onLoadMore, hasNextPage, isFetchingNextPage])

  return (
    <>
      <div ref={sentinelRef} className="h-1" />
      {isFetchingNextPage && loadingFallback}
    </>
  )
}
