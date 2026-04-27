"use client";

import { usePRDetail } from "@/hooks/usePRDetail";
import { usePRFiles } from "@/hooks/usePRFiles";
import { useReviewQuery } from "@/hooks/useReview";

export function useCachedPRDetail(prId: string) {
  return usePRDetail(prId, {
    enabled: false,
  });
}

export function useCachedPRFiles(prId: string) {
  return usePRFiles(prId, {
    enabled: false,
  });
}

export function useCachedReview(prId: string) {
  return useReviewQuery(prId, {
    enabled: false,
  });
}
