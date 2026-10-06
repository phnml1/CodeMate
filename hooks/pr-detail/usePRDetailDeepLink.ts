"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useCachedPRFiles } from "@/hooks/pr-detail/usePRDetailCachedQueries";
import { usePRDetailFileNavigation } from "@/hooks/pr-detail/usePRDetailFileNavigation";

export function usePRDetailDeepLink(prId: string) {
  const handledRef = useRef<string | null>(null);
  const searchParams = useSearchParams();
  const filePath = searchParams.get("filePath");
  const lineNumber = searchParams.get("lineNumber");
  const { data: files, isPending } = useCachedPRFiles(prId);
  const { selectAndScrollToLine } = usePRDetailFileNavigation(prId);

  useEffect(() => {
    if (!filePath || !lineNumber) {
      handledRef.current = null;
      return;
    }

    const lineNum = Number(lineNumber);
    if (!Number.isInteger(lineNum) || lineNum < 1) {
      handledRef.current = null;
      return;
    }
    if (isPending) return;
    if (!files?.some((file) => file.filename === filePath)) {
      handledRef.current = null;
      return;
    }

    const key = `${prId}:${filePath}:${lineNum}`;
    if (handledRef.current === key) return;
    handledRef.current = key;

    selectAndScrollToLine(filePath, lineNum);
  }, [prId, filePath, lineNumber, files, isPending, selectAndScrollToLine]);
}
