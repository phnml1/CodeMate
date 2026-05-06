"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getIndexedReviewIssues,
  groupIssuesByFile,
} from "@/lib/pr-detail/reviewUtils";
import { usePRCommentGroups } from "@/hooks/pr-detail/usePRCommentGroups";
import {
  useCachedPRFiles,
  useCachedReview,
} from "@/hooks/pr-detail/usePRDetailCachedQueries";
import { usePRDetailStore } from "@/stores/prDetailStore";
import type { ReviewIssue } from "@/types/review";
import type { CommentWithAuthor } from "@/types/comment";

const PRDiffViewer = dynamic(() => import("./PRDiffViewer"), {
  ssr: false,
  loading: () => <Skeleton className="h-96 w-full rounded-lg" />,
});

const EMPTY_ISSUES: ReviewIssue[] = [];
const EMPTY_COMMENTS: CommentWithAuthor[] = [];

interface PRDiffSectionProps {
  prId: string;
  currentUserId: string;
  onIssueClick: (issue: ReviewIssue) => void;
}

export default function PRDiffSection({
  prId,
  currentUserId,
  onIssueClick,
}: PRDiffSectionProps) {
  const { data: files = [], isPending, isError } = useCachedPRFiles(prId);
  const { data: review } = useCachedReview(prId);
  const selectedFile = usePRDetailStore((state) => state.selectedFile);
  const { inlineCommentsByFile } = usePRCommentGroups(prId);
  const issuesByFile = useMemo(
    () => groupIssuesByFile(getIndexedReviewIssues(review)),
    [review]
  );

  if (isPending) {
    return (
      <div className="space-y-4" aria-label="diff 로딩 중">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-medium text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
        변경 파일을 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <>
      {files.map((file) => (
        <PRDiffViewer
          key={file.filename}
          file={file}
          isActive={selectedFile === file.filename}
          issues={issuesByFile.get(file.filename) ?? EMPTY_ISSUES}
          onIssueClick={onIssueClick}
          prId={prId}
          currentUserId={currentUserId}
          inlineComments={inlineCommentsByFile[file.filename] ?? EMPTY_COMMENTS}
        />
      ))}
    </>
  );
}
