import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";

import type { PullRequest } from "@/types/pulls";

export const prDetailQueryKey = (id: string) => ["pullRequest", id] as const;
type PRDetailQueryKey = ReturnType<typeof prDetailQueryKey>;
type PRDetailQueryOptions = Omit<
  UseQueryOptions<PullRequest, Error, PullRequest, PRDetailQueryKey>,
  "queryKey" | "queryFn"
>;

async function fetchPRDetail(id: string): Promise<PullRequest> {
  const res = await fetch(`/api/pulls/${id}`);
  if (!res.ok) throw new Error("PR 상세 정보를 불러오는 데 실패했습니다.");
  return res.json();
}

export function usePRDetail(id: string, options?: PRDetailQueryOptions) {
  return useQuery({
    queryKey: prDetailQueryKey(id),
    queryFn: () => fetchPRDetail(id),
    ...options,
  });
}
