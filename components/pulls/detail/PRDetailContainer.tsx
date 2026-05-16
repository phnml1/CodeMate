"use client";

import PRDetailLayout from "@/components/pulls/detail/PRDetailLayout";
import { usePRDetail } from "@/hooks/usePRDetail";
import { usePRFiles } from "@/hooks/usePRFiles";
import { layoutStyles } from "@/lib/styles";
import type { PullRequest } from "@/types/pulls";

interface PRDetailContainerProps {
  id: string;
  commentSlot: React.ReactNode;
  currentUserId: string;
  initialPullRequest?: PullRequest | null;
}

export default function PRDetailContainer({
  id,
  commentSlot,
  currentUserId,
  initialPullRequest,
}: PRDetailContainerProps) {
  const { data: pr, isPending: prPending, isError: prError } = usePRDetail(id, {
    initialData: initialPullRequest ?? undefined,
    staleTime: initialPullRequest ? 30_000 : undefined,
  });
  usePRFiles(id);

  if (prPending) {
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

  if (prError || !pr) {
    return (
      <div className={`${layoutStyles.detailFrame} items-center justify-center`}>
        <div className="space-y-2 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            PR 정보를 불러오는 데 실패했습니다.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            잠시 후 다시 시도해주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PRDetailLayout
      id={id}
      commentSlot={commentSlot}
      currentUserId={currentUserId}
      initialPullRequest={pr}
    />
  );
}
