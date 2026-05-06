"use client"

import { useConnectRepository } from "@/hooks/useConnectRepository"
import { useDisconnectRepository } from "@/hooks/useDisconnectRepository"
import { useRepositories } from "@/hooks/useRepositories"
import RepoCard from "@/components/github/RepoCard"
import RepoCardSkeleton from "@/components/github/RepoCardSkeleton"
import RepoListHeader from "@/components/github/RepoListHeader"
import { InfiniteScrollTrigger } from "@/components/ui/InfiniteScrollTrigger"
import { layoutStyles, surfaceStyles } from "@/lib/styles"

interface RepoListProps {
  search?: string
  repositoriesQuery: ReturnType<typeof useRepositories>
}

export default function RepoList({
  search = "",
  repositoriesQuery,
}: RepoListProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = repositoriesQuery

  const connectMutation = useConnectRepository()
  const { mutate: disconnect } = useDisconnectRepository()

  if (isLoading) {
    return (
      <div className={layoutStyles.listStack}>
        {Array.from({ length: 3 }).map((_, i) => (
          <RepoCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className={surfaceStyles.emptyState}>
        {error instanceof Error
          ? error.message
          : "저장소 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."}
      </div>
    )
  }

  const repos = data?.pages.flatMap((page) => page.repos) ?? []
  const filtered = search
    ? repos.filter((repo) => repo.name.toLowerCase().includes(search.toLowerCase()))
    : repos

  if (filtered.length === 0) {
    return (
      <div className={surfaceStyles.emptyState}>
        {search ? "검색 결과가 없습니다." : "저장소가 없습니다."}
      </div>
    )
  }

  return (
    <div className={layoutStyles.listStack}>
      <RepoListHeader count={filtered.length} />
      <div className={layoutStyles.listStack}>
        {filtered.map((repo) => (
          <RepoCard
            key={repo.id}
            githubId={repo.id}
            name={repo.name}
            fullName={repo.fullName}
            language={repo.language}
            isConnected={repo.isConnected}
            repositoryId={repo.repositoryId}
            isConnecting={
              connectMutation.isPending &&
              connectMutation.variables?.githubId === repo.id
            }
            connectError={
              connectMutation.isError &&
              connectMutation.variables?.githubId === repo.id
                ? connectMutation.error instanceof Error
                  ? connectMutation.error.message
                  : "저장소 연결 중 오류가 발생했습니다."
                : null
            }
            onConnect={() =>
              connectMutation.mutate({
                githubId: repo.id,
                name: repo.name,
                fullName: repo.fullName,
                language: repo.language,
                canAdminister: repo.canAdminister,
              })
            }
            onDisconnect={() => repo.repositoryId && disconnect(repo.repositoryId)}
          />
        ))}
      </div>

      <InfiniteScrollTrigger
        onLoadMore={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        loadingFallback={
          <div className={layoutStyles.listStack}>
            <RepoCardSkeleton />
            <RepoCardSkeleton />
          </div>
        }
      />
    </div>
  )
}
