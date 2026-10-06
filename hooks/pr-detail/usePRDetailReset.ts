"use client";

import { useEffect, useRef } from "react";
import { useCachedPRFiles } from "@/hooks/pr-detail/usePRDetailCachedQueries";
import { usePRDetailStore } from "@/stores/prDetailStore";

export function usePRDetailReset(prId: string) {
  const { data: files, isPending } = useCachedPRFiles(prId);
  const reset = usePRDetailStore((state) => state.reset);
  const resetRef = useRef<string | null>(null);

  useEffect(() => {
    if (isPending || resetRef.current === prId) return;
    reset(files?.[0]?.filename);
    resetRef.current = prId;
  }, [files, isPending, prId, reset]);
}
