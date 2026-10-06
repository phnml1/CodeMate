"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { parsePatch } from "@/lib/diff";
import type { PRFile } from "@/types/pulls";
import type { ReviewIssue } from "@/types/review";
import type { CommentWithAuthor } from "@/types/comment";
import DiffHeader from "./DiffHeader";
import DiffTable from "./DiffTable";
import { usePRDetailStore } from "@/stores/prDetailStore";
import { getDiffLineId } from "@/lib/pr-detail/diffUtils";

interface PRDiffViewerProps {
  file: PRFile;
  isActive?: boolean;
  issues?: ReviewIssue[];
  onIssueClick?: (issue: ReviewIssue) => void;
  prId: string;
  currentUserId: string;
  inlineComments: CommentWithAuthor[];
  scrollRootRef: RefObject<HTMLDivElement | null>;
}

function PRDiffViewer({
  file,
  isActive = false,
  issues = [],
  onIssueClick,
  prId,
  currentUserId,
  inlineComments,
  scrollRootRef,
}: PRDiffViewerProps) {
  const collapsed = usePRDetailStore((s) => s.collapsedDiffs[file.filename] ?? false);
  const toggleDiff = usePRDetailStore((s) => s.toggleDiff);
  const finishNavigation = usePRDetailStore((s) => s.finishNavigation);
  const navigationTarget = usePRDetailStore((s) =>
    s.navigationTarget?.prId === prId && s.navigationTarget.filePath === file.filename
      ? s.navigationTarget
      : null
  );
  const wrapperRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [bodyHeight, setBodyHeight] = useState<number | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const renderBody = isActive || nearViewport || composerOpen;
  const estimatedHeight = useMemo(
    () => Math.max(100, (file.patch?.split("\n").length ?? 0) * 22),
    [file.patch]
  );
  const lines = useMemo(
    () => (!collapsed && renderBody && file.patch ? parsePatch(file.patch) : []),
    [collapsed, renderBody, file.patch]
  );

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const root = scrollRootRef.current;
    if (!wrapper || !root) return;

    const observer = new IntersectionObserver(
      ([entry]) => setNearViewport(entry.isIntersecting),
      { root, rootMargin: "800px 0px" }
    );
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [scrollRootRef]);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body || !renderBody || collapsed) return;

    const measure = () => {
      const height = Math.ceil(body.getBoundingClientRect().height);
      setBodyHeight((previous) => (previous === height ? previous : height));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    return () => observer.disconnect();
  }, [collapsed, renderBody]);

  useLayoutEffect(() => {
    if (!navigationTarget || (navigationTarget.lineNumber != null && (collapsed || !renderBody))) return;

    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const line = navigationTarget.lineNumber == null
      ? null
      : document.getElementById(getDiffLineId(file.filename, navigationTarget.lineNumber));
    const target = line ?? wrapper;
    target.scrollIntoView({ behavior: "instant", block: line ? "center" : "start" });
    finishNavigation(navigationTarget.requestId);
  }, [collapsed, file.filename, finishNavigation, navigationTarget, renderBody]);

  return (
    <div
      ref={wrapperRef}
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
        onToggle={() => {
          if (!collapsed) setComposerOpen(false);
          toggleDiff(file.filename);
        }}
        isActive={isActive}
        inlineCommentCount={inlineComments.length}
      />
      {!collapsed && (
        <div
          id={`diff-body-${file.filename}`}
          ref={renderBody ? bodyRef : undefined}
          className="overflow-x-auto min-w-0 min-h-25"
        >
          {file.patch === null ? (
            <div className="p-6 text-center text-sm text-slate-400">
              Binary file or no diff available
            </div>
          ) : renderBody ? (
            <DiffTable
              lines={lines}
              issues={issues}
              onIssueClick={onIssueClick}
              inlineComments={inlineComments}
              prId={prId}
              filePath={file.filename}
              currentUserId={currentUserId}
              onComposerOpenChange={setComposerOpen}
            />
          ) : (
            <div
              aria-hidden="true"
              className="bg-slate-50/40 dark:bg-slate-900/40"
              style={{ height: bodyHeight ?? estimatedHeight }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default memo(PRDiffViewer);
