"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
  const [requestError, setRequestError] = useState<string | null>(null);

  const requestReview = useCallback(async () => {
    setIsRequesting(true);
    setRequestError(null);

    try {
      const res = await fetch("/api/review/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pullRequestId: prId }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "AI 리뷰 요청에 실패했습니다.");
      }

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
      toast.success("AI 리뷰 요청을 시작했습니다.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "AI 리뷰 요청에 실패했습니다.";

      setRequestError(message);
      toast.error("AI 리뷰 요청 실패", {
        description: message,
      });
    } finally {
      setIsRequesting(false);
    }
  }, [prId, queryClient]);

  return { requestReview, isRequesting, requestError };
}
