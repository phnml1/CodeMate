"use client";

import { useCallback, useEffect, useState } from "react";
import { useInlineTypingIndicator } from "@/hooks/useInlineTypingIndicator";
import { usePRDetailFileNavigation } from "@/hooks/pr-detail/usePRDetailFileNavigation";

type InlineTypingItem = ReturnType<
  typeof useInlineTypingIndicator
>["allInlineTyping"][number];

function isSameInlineTypingItems(
  prev: InlineTypingItem[],
  nextItems: InlineTypingItem[]
) {
  return (
    prev.length === nextItems.length &&
    prev.every((item, index) => {
      const next = nextItems[index];

      return (
        item.userId === next?.userId &&
        item.userName === next?.userName &&
        item.filePath === next?.filePath &&
        item.lineNumber === next?.lineNumber
      );
    })
  );
}

export function useInlineTypingBanner(prId: string) {
  const { allInlineTyping: liveInlineTyping } = useInlineTypingIndicator(prId);
  const [visibleInlineTyping, setVisibleInlineTyping] =
    useState(liveInlineTyping);
  const { selectAndScrollToLine } = usePRDetailFileNavigation();

  useEffect(() => {
    const delay = liveInlineTyping.length > 0 ? 0 : 500;
    const timer = window.setTimeout(() => {
      setVisibleInlineTyping((prev) =>
        isSameInlineTypingItems(prev, liveInlineTyping) ? prev : liveInlineTyping
      );
    }, delay);

    return () => window.clearTimeout(timer);
  }, [liveInlineTyping]);

  const handleTypingItemClick = useCallback(
    (item: InlineTypingItem) => {
      selectAndScrollToLine(item.filePath, item.lineNumber);
    },
    [selectAndScrollToLine]
  );

  return { visibleInlineTyping, handleTypingItemClick };
}
