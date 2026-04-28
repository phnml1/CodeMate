"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { usePRDetailFileNavigation } from "@/hooks/pr-detail/usePRDetailFileNavigation";

export function usePRDetailDeepLink(prId: string) {
  const initializedRef = useRef<string | null>(null);
  const searchParams = useSearchParams();
  const { selectAndScrollToLine } = usePRDetailFileNavigation();

  useEffect(() => {
    const filePath = searchParams.get("filePath");
    const lineNumber = searchParams.get("lineNumber");

    if (initializedRef.current === prId) return;
    initializedRef.current = prId;

    if (!filePath || !lineNumber) return;

    const lineNum = Number.parseInt(lineNumber, 10);
    if (Number.isNaN(lineNum)) return;

    selectAndScrollToLine(filePath, lineNum);
  }, [prId, searchParams, selectAndScrollToLine]);
}
