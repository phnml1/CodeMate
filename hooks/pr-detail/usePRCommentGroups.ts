"use client";

import { useMemo } from "react";
import { useComments } from "@/hooks/useComments";
import {
  getCommentCountsByFile,
  getGeneralCommentCount,
  groupInlineCommentsByFile,
} from "@/lib/pr-detail/commentUtils";

export function usePRCommentGroups(prId: string) {
  const { data: allComments = [] } = useComments(prId);

  return useMemo(() => {
    const inlineCommentsByFile = groupInlineCommentsByFile(allComments);

    return {
      allComments,
      inlineCommentsByFile,
      commentCountsByFile: getCommentCountsByFile(inlineCommentsByFile),
      generalCommentCount: getGeneralCommentCount(allComments),
    };
  }, [allComments]);
}
