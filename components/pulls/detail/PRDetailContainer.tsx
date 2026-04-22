"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import PRDetailLayout from "@/components/pulls/detail/PRDetailLayout";
import { usePRDetail } from "@/hooks/usePRDetail";
import { usePRFiles } from "@/hooks/usePRFiles";
import { useReview } from "@/hooks/useReview";
import { layoutStyles } from "@/lib/styles";
import type { Review } from "@/types/review";

interface PRDetailContainerProps {
  id: string;
  commentSlot: React.ReactNode;
  currentUserId: string;
}

export default function PRDetailContainer({
  id,
  commentSlot,
  currentUserId,
}: PRDetailContainerProps) {
  const { data: pr, isPending: prPending, isError: prError } = usePRDetail(id);
  const { data: files, isPending: filesPending, isError: filesError } = usePRFiles(id);
  const { data: review, isPending: reviewPending } = useReview(id);
  const queryClient = useQueryClient();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestReview = async () => {
    setIsRequesting(true);
    try {
      const res = await fetch("/api/review/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pullRequestId: id }),
      });

      if (res.ok) {
        queryClient.setQueryData<Review | null>(["review", id], (current) =>
          current
            ? {
                ...current,
                status: "PENDING",
                failureReason: null,
              }
            : current
        );

        await queryClient.invalidateQueries({ queryKey: ["review", id] });
      }
    } finally {
      setIsRequesting(false);
    }
  };

  if (prPending || filesPending) {
    return (
      <div className={`${layoutStyles.detailFrame} animate-pulse`}>
        <div className="w-72 shrink-0 border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />
        <div className="flex-1 space-y-4 p-6">
          <div className="h-8 w-2/3 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-1/3 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-48 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-48 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  if (prError || filesError || !pr || !files) {
    return (
      <div className={`${layoutStyles.detailFrame} items-center justify-center`}>
        <div className="space-y-2 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            PR 정보를 불러오는 데 실패했습니다.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            잠시 후 다시 시도해 주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PRDetailLayout
      pr={pr}
      files={files}
      review={review}
      isReviewPending={reviewPending}
      onRequestReview={handleRequestReview}
      isRequesting={isRequesting}
      commentSlot={commentSlot}
      currentUserId={currentUserId}
    />
  );
}
