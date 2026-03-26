"use client";

import { useState } from "react";
import { usePRDetail } from "@/hooks/usePRDetail";
import { usePRFiles } from "@/hooks/usePRFiles";
import { useReview } from "@/hooks/useReview";
import { useQueryClient } from "@tanstack/react-query";
import PRDetailLayout from "@/components/pulls/detail/PRDetailLayout";

interface PRDetailContainerProps {
  id: string;
  commentSlot: React.ReactNode;
  currentUserId: string;
}

export default function PRDetailContainer({ id, commentSlot, currentUserId }: PRDetailContainerProps) {
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
        // PENDING 상태로 즉시 반영 → polling + 소켓 알림이 완료 시 자동 갱신
        await queryClient.invalidateQueries({ queryKey: ["review", id] });
      }
    } finally {
      setIsRequesting(false);
    }
  };

  if (prPending || filesPending) {
    return (
      <div className="flex h-[calc(100svh-6.5rem)] md:h-[calc(100svh-8.5rem)] lg:h-[calc(100svh-9.5rem)] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[24px] shadow-sm mt-2 animate-pulse">
        <div className="w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900" />
        <div className="flex-1 p-6 space-y-4">
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-2/3" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3" />
          <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (prError || filesError || !pr || !files) {
    return (
      <div className="flex items-center justify-center h-[calc(100svh-6.5rem)] md:h-[calc(100svh-8.5rem)] lg:h-[calc(100svh-9.5rem)] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[24px] shadow-sm mt-2">
        <div className="text-center space-y-2">
          <p className="text-slate-500 dark:text-slate-400 text-sm">PR 정보를 불러오는 데 실패했습니다.</p>
          <p className="text-slate-400 dark:text-slate-500 text-xs">잠시 후 다시 시도해주세요.</p>
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
