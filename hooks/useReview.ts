import { useQuery } from "@tanstack/react-query";
import type { Review } from "@/types/review";

async function fetchReview(prId: string): Promise<Review | null> {
  const res = await fetch(`/api/pulls/${prId}/review`);
  if (!res.ok) throw new Error("리뷰 데이터를 불러오는 데 실패했습니다.");
  return res.json();
}

export function useReview(prId: string) {
  return useQuery({
    queryKey: ["review", prId],
    queryFn: () => fetchReview(prId),
  });
}
