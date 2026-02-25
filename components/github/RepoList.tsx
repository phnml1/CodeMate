"use client"

import { useConnectRepository } from "@/hooks/useConnectRepository"
import { useDisconnectRepository } from "@/hooks/useDisconnectRepository"
import { useRepositories } from "@/hooks/useRepositories"
import RepoCard from "@/components/github/RepoCard"
import RepoCardSkeleton from "@/components/github/RepoCardSkeleton"
import RepoListHeader from "@/components/github/RepoListHeader"
import { InfiniteScrollTrigger } from "@/components/ui/InfiniteScrollTrigger"

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

  const { mutate: connect } = useConnectRepository()
  const { mutate: disconnect } = useDisconnectRepository()

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
      <RepoListHeader count={filtered.length} />
      <div className="space-y-4">
        {filtered.map((repo) => (
          <RepoCard
            key={repo.id}
            githubId={repo.id}
            name={repo.name}
            fullName={repo.fullName}
            language={repo.language}
            isConnected={repo.isConnected}
            repositoryId={repo.repositoryId}
            onConnect={() => connect({
              githubId: repo.id,
              name: repo.name,
              fullName: repo.fullName,
              language: repo.language,
            })}
            onDisconnect={() => repo.repositoryId && disconnect(repo.repositoryId)}
          />
        ))}
      </div>

      <InfiniteScrollTrigger
        onLoadMore={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        loadingFallback={
          <div className="space-y-4">
            <RepoCardSkeleton />
            <RepoCardSkeleton />
          </div>
        }
      />
    </div>
  )
}
