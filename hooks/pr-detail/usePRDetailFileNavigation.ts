"use client";

import { useCallback } from "react";
import { usePRDetailStore } from "@/stores/prDetailStore";

export function usePRDetailFileNavigation(prId: string) {
  const navigateToFile = usePRDetailStore((state) => state.navigateToFile);

  const selectAndScrollToFile = useCallback(
    (filename: string) => {
      navigateToFile(prId, filename);
    },
    [navigateToFile, prId]
  );

  const selectAndScrollToLine = useCallback(
    (filePath: string, lineNumber: number) => {
      navigateToFile(prId, filePath, lineNumber);
    },
    [navigateToFile, prId]
  );

  return { selectAndScrollToFile, selectAndScrollToLine };
}
