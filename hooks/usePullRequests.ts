import { useInfiniteQuery } from "@tanstack/react-query";

import type { PRStatus, PullRequestListResponse } from "@/types/pulls";

async function fetchPullRequestsPage({
  status,
  page,
}: {
  status?: PRStatus;
  page: number;
}): Promise<PullRequestListResponse> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("page", String(page));

  const res = await fetch(`/api/pulls?${params}`);
  if (!res.ok) throw new Error("PR 목록을 불러오는 데 실패했습니다.");
  return res.json();
}

export function usePullRequests(status?: PRStatus) {
  return useInfiniteQuery({
    queryKey: ["pullRequests", status],
    queryFn: ({ pageParam }) =>
      fetchPullRequestsPage({ status, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });
}
