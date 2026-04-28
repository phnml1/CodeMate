"use client";

import { useEffect, useRef } from "react";
import { useCachedPRFiles } from "@/hooks/pr-detail/usePRDetailCachedQueries";
import { usePRDetailStore } from "@/stores/prDetailStore";

export function usePRDetailReset(prId: string) {
  const { data: files = [] } = useCachedPRFiles(prId);
  const reset = usePRDetailStore((state) => state.reset);
  const resetRef = useRef<string | null>(null);

  useEffect(() => {
    const initialFile = files[0]?.filename;
    const resetKey = `${prId}:${initialFile ?? ""}:${files.length}`;

    if (resetRef.current === resetKey) return;

    reset(initialFile);
    resetRef.current = resetKey;
  }, [files, prId, reset]);
}
