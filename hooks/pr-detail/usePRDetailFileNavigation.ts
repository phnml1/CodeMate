"use client";

import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  getDiffFileId,
  getDiffLineId,
  scrollToElementById,
} from "@/lib/pr-detail/diffUtils";
import { usePRDetailStore } from "@/stores/prDetailStore";

export function usePRDetailFileNavigation() {
  const { expandDiff, selectFile, setMobileFileOpen } = usePRDetailStore(
    useShallow((state) => ({
      expandDiff: state.expandDiff,
      selectFile: state.selectFile,
      setMobileFileOpen: state.setMobileFileOpen,
    }))
  );

  const selectAndScrollToFile = useCallback(
    (filename: string) => {
      selectFile(filename);
      setMobileFileOpen(false);
      scrollToElementById(getDiffFileId(filename), {
        behavior: "smooth",
        block: "start",
      });
    },
    [selectFile, setMobileFileOpen]
  );

  const selectAndScrollToLine = useCallback(
    (filePath: string, lineNumber: number) => {
      expandDiff(filePath);
      selectFile(filePath);
      setMobileFileOpen(false);
      scrollToElementById(getDiffLineId(filePath, lineNumber));
    },
    [expandDiff, selectFile, setMobileFileOpen]
  );

  return { selectAndScrollToFile, selectAndScrollToLine };
}
