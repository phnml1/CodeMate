import { useQuery } from "@tanstack/react-query";

import type { PullRequest } from "@/types/pulls";

async function fetchPRDetail(id: string): Promise<PullRequest> {
  const res = await fetch(`/api/pulls/${id}`);
  if (!res.ok) throw new Error("PR 상세 정보를 불러오는 데 실패했습니다.");
  return res.json();
}

export function usePRDetail(id: string) {
  return useQuery({
    queryKey: ["pullRequest", id],
    queryFn: () => fetchPRDetail(id),
  });
}
