"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Review } from "@/types/review";

function createPendingReview(prId: string): Review {
  return {
    id: `pending-${prId}`,
    pullRequestId: prId,
    qualityScore: 0,
    severity: "LOW",
    issueCount: 0,
    status: "PENDING",
    stage: "QUEUED",
    aiSuggestions: {
      issues: [],
      summary: "",
      overallAssessment: "COMMENT",
    },
    reviewedAt: new Date().toISOString(),
  };
}

export function usePRReviewActions(prId: string) {
  const queryClient = useQueryClient();
  const [isRequesting, setIsRequesting] = useState(false);

  const requestReview = useCallback(async () => {
    setIsRequesting(true);

    try {
      const res = await fetch("/api/review/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pullRequestId: prId }),
      });

      if (!res.ok) return;

      queryClient.setQueryData<Review | null>(["review", prId], (current) =>
        current
          ? {
              ...current,
              status: "PENDING",
              stage: "QUEUED",
            }
          : createPendingReview(prId)
      );

      await queryClient.invalidateQueries({ queryKey: ["review", prId] });
    } finally {
      setIsRequesting(false);
    }
  }, [prId, queryClient]);

  return { requestReview, isRequesting };
}
