"use client"

import { useEffect, useRef } from "react"

import { useRepositories } from "@/hooks/useRepositories"
import RepoCard from "@/components/github/RepoCard"
import RepoCardSkeleton from "@/components/github/RepoCardSkeleton"

interface RepoListProps {
  search?: string
}

export default function RepoList({ search = "" }: RepoListProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useRepositories()

  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <RepoCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="py-20 text-center text-sm text-slate-400 font-medium">
        저장소 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
      </div>
    )
  }

  const repos = data?.pages.flatMap((page) => page.repos) ?? []
  const filtered = search
    ? repos.filter((repo) => repo.name.toLowerCase().includes(search.toLowerCase()))
    : repos

  if (filtered.length === 0) {
    return (
      <div className="py-20 text-center text-sm text-slate-400 font-medium">
        {search ? "검색 결과가 없습니다." : "저장소가 없습니다."}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-lg font-bold text-slate-900">저장소 목록</h2>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {filtered.length} Repositories Found
        </span>
      </div>
      <div className="space-y-4">
        {filtered.map((repo) => (
          <RepoCard
            key={repo.id}
            githubId={repo.id}
            name={repo.name}
            fullName={repo.fullName}
            language={repo.language}
            isConnected={repo.isConnected}
            onConnect={() => console.log("connect", repo)}
            onDisconnect={() => console.log("disconnect", repo)}
          />
        ))}
      </div>

      {/* 무한스크롤 감지 센티넬 */}
      <div ref={sentinelRef} className="h-1" />

      {isFetchingNextPage && (
        <div className="space-y-4">
          <RepoCardSkeleton />
          <RepoCardSkeleton />
        </div>
      )}
    </div>
  )
}
