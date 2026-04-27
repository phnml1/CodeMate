"use client";

import { useMemo, useState } from "react";
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

const IssueDetailModal = dynamic(
  () => import("@/components/review/IssueDetailModal"),
  { ssr: false }
);

const EMPTY_ISSUES: ReviewIssue[] = [];
const EMPTY_COMMENTS: CommentWithAuthor[] = [];

interface PRDiffSectionProps {
  prId: string;
  currentUserId: string;
}

export default function PRDiffSection({
  prId,
  currentUserId,
}: PRDiffSectionProps) {
  const { data: files = [] } = useCachedPRFiles(prId);
  const { data: review } = useCachedReview(prId);
  const selectedFile = usePRDetailStore((state) => state.selectedFile);
  const { inlineCommentsByFile } = usePRCommentGroups(prId);
  const [selectedIssue, setSelectedIssue] = useState<ReviewIssue | null>(null);
  const issuesByFile = useMemo(
    () => groupIssuesByFile(getIndexedReviewIssues(review)),
    [review]
  );

  return (
    <>
      {files.map((file) => (
        <PRDiffViewer
          key={file.filename}
          file={file}
          isActive={selectedFile === file.filename}
          issues={issuesByFile.get(file.filename) ?? EMPTY_ISSUES}
          onIssueClick={setSelectedIssue}
          prId={prId}
          currentUserId={currentUserId}
          inlineComments={inlineCommentsByFile[file.filename] ?? EMPTY_COMMENTS}
        />
      ))}

      <IssueDetailModal
        issue={selectedIssue}
        onClose={() => setSelectedIssue(null)}
      />
    </>
  );
}
