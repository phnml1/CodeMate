import { useQuery } from "@tanstack/react-query";

import type { PRFile } from "@/types/pulls";

async function fetchPRFiles(id: string): Promise<PRFile[]> {
  const res = await fetch(`/api/pulls/${id}/files`);
  if (!res.ok) throw new Error("PR 파일 목록을 불러오는 데 실패했습니다.");
  const data = await res.json();
  return data.files;
}

export function usePRFiles(id: string) {
  return useQuery({
    queryKey: ["pullRequestFiles", id],
    queryFn: () => fetchPRFiles(id),
  });
}
