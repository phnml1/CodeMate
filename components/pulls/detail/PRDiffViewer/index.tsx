"use client";

import { parsePatch } from "@/lib/diff";
import type { PRFile } from "@/types/pulls";
import type { ReviewIssue } from "@/types/review";
import type { CommentWithAuthor } from "@/types/comment";
import DiffHeader from "./DiffHeader";
import DiffTable from "./DiffTable";
import { usePRDetailStore } from "@/stores/prDetailStore";

interface PRDiffViewerProps {
  file: PRFile;
  isActive?: boolean;
  issues?: ReviewIssue[];
  onIssueClick?: (issue: ReviewIssue) => void;
  prId: string;
  currentUserId: string;
  currentUserName?: string | null;
  currentUserImage?: string | null;
  inlineComments: CommentWithAuthor[];
}

export default function PRDiffViewer({
  file,
  isActive = false,
  issues = [],
  onIssueClick,
  prId,
  currentUserId,
  currentUserName,
  currentUserImage,
  inlineComments,
}: PRDiffViewerProps) {
  const collapsed = usePRDetailStore((s) => s.collapsedDiffs[file.filename] ?? false);
  const toggleDiff = usePRDetailStore((s) => s.toggleDiff);
  const lines = file.patch ? parsePatch(file.patch) : [];

  return (
    <div
      id={`diff-${file.filename}`}
      className={`scroll-mt-36 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 transition-all duration-300 mb-4 ${
        isActive
          ? "border border-blue-400 dark:border-blue-500 shadow-md shadow-blue-100 dark:shadow-blue-950/40"
          : "border border-slate-200 dark:border-slate-800 shadow-sm"
      }`}
    >
      <DiffHeader
        file={file}
        collapsed={collapsed}
        onToggle={() => toggleDiff(file.filename)}
        isActive={isActive}
        inlineCommentCount={inlineComments.length}
      />
      {!collapsed && (
        <div id={`diff-body-${file.filename}`} className="overflow-x-auto min-w-0 min-h-25">
          {file.patch === null ? (
            <div className="p-6 text-center text-sm text-slate-400">
              Binary file or no diff available
            </div>
          ) : (
            <DiffTable
              lines={lines}
              issues={issues}
              onIssueClick={onIssueClick}
              inlineComments={inlineComments}
              prId={prId}
              filePath={file.filename}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              currentUserImage={currentUserImage}
            />
          )}
        </div>
      )}
    </div>
  );
}
