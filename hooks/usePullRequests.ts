import { useInfiniteQuery } from "@tanstack/react-query";

import type { PRStatus, PullRequestListResponse } from "@/types/pulls";

interface PullRequestFilter {
  status?: PRStatus;
  repoId?: string;
}

async function fetchPullRequestsPage({
  status,
  repoId,
  page,
}: PullRequestFilter & {
  page: number;
}): Promise<PullRequestListResponse> {
  const params = new URLSearchParams();

  if (status) params.set("status", status);
  if (repoId) params.set("repoId", repoId);
  params.set("page", String(page));

  const res = await fetch(`/api/pulls?${params}`);

  if (!res.ok) {
    throw new Error("Failed to load pull requests.");
  }

  return res.json();
}

export function usePullRequests(filter: PullRequestFilter) {
  return useInfiniteQuery({
    queryKey: ["pullRequests", filter.status, filter.repoId],
    queryFn: ({ pageParam }) =>
      fetchPullRequestsPage({ ...filter, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });
}
