import { useInfiniteQuery } from "@tanstack/react-query"

import type { RepoListResponse } from "@/types/repos"

async function fetchRepositoriesPage(page: number): Promise<RepoListResponse> {
  const params = new URLSearchParams()
  params.set("page", String(page))

  const res = await fetch(`/api/github/repos?${params}`)

  if (!res.ok) {
    const body = await res.json().catch(() => null)

    throw new Error(
      typeof body?.error === "string"
        ? body.error
        : "저장소 목록을 불러오지 못했습니다."
    )
  }

  return res.json()
}

export function useRepositories() {
  return useInfiniteQuery({
    queryKey: ["repositories"],
    queryFn: ({ pageParam }) => fetchRepositoriesPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, hasNextPage } = lastPage.pagination
      return hasNextPage ? page + 1 : undefined
    },
  })
}
