import { useInfiniteQuery } from "@tanstack/react-query";

import type { PRStatus, PullRequestListResponse } from "@/types/pulls";

interface PullRequestFilter {
  status?: PRStatus;
  search?: string;
}

async function fetchPullRequestsPage({
  status,
  search,
  page,
}: PullRequestFilter & {
  page: number;
}): Promise<PullRequestListResponse> {
  const params = new URLSearchParams();

  if (status) params.set("status", status);
  if (search) params.set("search", search);
  params.set("page", String(page));

  const res = await fetch(`/api/pulls?${params}`);

  if (!res.ok) {
    throw new Error("Failed to load pull requests.");
  }

  return res.json();
}

export function usePullRequests(filter: PullRequestFilter) {
  return useInfiniteQuery({
    queryKey: ["pullRequests", filter.status, filter.search],
    queryFn: ({ pageParam }) =>
      fetchPullRequestsPage({ ...filter, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });
}
