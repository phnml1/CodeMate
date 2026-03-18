"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, ChevronDown, BotMessageSquare } from "lucide-react";
import PRFileList from "./PRFileList";
import PRDetailHeader from "./PRDetailHeader";
import PRDiffViewer from "./PRDiffViewer";
import FileIcon from "./FileIcon";
import { usePRDetailStore } from "@/stores/prDetailStore";
import type { PRFile, PullRequest } from "@/types/pulls";
import type { Review, ReviewIssue } from "@/types/review";
import ReviewPanel from "@/components/review/ReviewPanel";
import IssueDetailModal from "@/components/review/IssueDetailModal";

interface PRDetailLayoutProps {
  pr: PullRequest;
  files: PRFile[];
  review: Review | null | undefined;
  isReviewPending: boolean;
  onRequestReview: () => void;
  isRequesting?: boolean;
  commentSlot: React.ReactNode;
}

export default function PRDetailLayout({
  pr,
  files,
  review,
  isReviewPending,
  onRequestReview,
  isRequesting = false,
  commentSlot,
}: PRDetailLayoutProps) {
  const selectedFile = usePRDetailStore((s) => s.selectedFile);
  const sidebarCollapsed = usePRDetailStore((s) => s.sidebarCollapsed);
  const mobileFileOpen = usePRDetailStore((s) => s.mobileFileOpen);
  const selectFile = usePRDetailStore((s) => s.selectFile);
  const setSidebarCollapsed = usePRDetailStore((s) => s.setSidebarCollapsed);
  const setMobileFileOpen = usePRDetailStore((s) => s.setMobileFileOpen);
  const reset = usePRDetailStore((s) => s.reset);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<ReviewIssue | null>(null);

  useEffect(() => {
    reset(files[0]?.filename);
  }, [pr.id, files, reset]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setScrolled(el.scrollTop > 60);
  };

  const handleSelectFile = (filename: string) => {
    selectFile(filename);
    requestAnimationFrame(() => {
      document.getElementById(`diff-${filename}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  // originalIndex를 각 이슈에 부여해서 issuesByFile 맵 생성
  const rawIssues = review?.aiSuggestions?.issues ?? [];
  const issuesByFile = new Map<string, ReviewIssue[]>();
  for (let i = 0; i < rawIssues.length; i++) {
    const issue = rawIssues[i];
    const list = issuesByFile.get(issue.filePath) ?? [];
    list.push({ ...issue, originalIndex: i });
    issuesByFile.set(issue.filePath, list);
  }

  return (
    <>
      <div className="flex h-[calc(100svh-6.5rem)] md:h-[calc(100svh-8.5rem)] lg:h-[calc(100svh-9.5rem)] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[24px] shadow-sm relative min-w-0 overflow-hidden mt-2">
        <PRFileList
          files={files}
          selectedFile={selectedFile}
          onSelectFile={handleSelectFile}
          collapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
        />
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950 relative overflow-y-auto overflow-x-hidden"
        >
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              aria-label="파일 목록 열기"
              className="absolute left-0 top-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-r-lg shadow-md hidden md:block z-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          )}

          {/* Sticky top: 헤더 + 모바일 파일 드롭다운 */}
          <div className="sticky top-0 z-20">
            <PRDetailHeader pr={pr} scrolled={scrolled} />

            {/* 모바일 파일 선택 드롭다운 */}
            <div className="md:hidden relative bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2">
              <button
                onClick={() => setMobileFileOpen(!mobileFileOpen)}
                aria-expanded={mobileFileOpen}
                aria-label="변경된 파일 목록 보기"
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {selectedFile ? (
                    <>
                      <FileIcon filename={selectedFile} size={14} />
                      <span className="truncate text-xs font-bold text-blue-600 dark:text-blue-400">{selectedFile}</span>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">파일 선택</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-slate-400 font-bold">{files.length} files</span>
                  <ChevronDown
                    size={14}
                    className={`text-slate-400 transition-transform duration-200 ${mobileFileOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              {mobileFileOpen && (
                <div className="absolute left-0 right-0 top-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-lg z-30 max-h-64 overflow-y-auto">
                  {files.map((file) => (
                    <button
                      key={file.filename}
                      onClick={() => handleSelectFile(file.filename)}
                      aria-current={selectedFile === file.filename ? "true" : undefined}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
                        selectedFile === file.filename
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileIcon filename={file.filename} size={14} />
                        <span className="text-xs font-bold truncate">{file.filename}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-black shrink-0 ml-2">
                        <span className="text-emerald-600">+{file.additions}</span>
                        <span className="text-rose-500">-{file.deletions}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* AI 리뷰 패널 */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setReviewOpen((v) => !v)}
                aria-expanded={reviewOpen}
                className="w-full px-5 py-3 flex items-center justify-between bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BotMessageSquare size={16} className="text-blue-500" />
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    AI 코드 리뷰
                  </span>
                  {review?.issueCount != null && review.issueCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      {review.issueCount}개 이슈
                    </span>
                  )}
                  {review?.status === "COMPLETED" && review.issueCount === 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      이슈 없음
                    </span>
                  )}
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform duration-200 ${reviewOpen ? "rotate-180" : ""}`}
                />
              </button>
              {reviewOpen && (
                <div className="p-4">
                  <ReviewPanel
                    review={review}
                    isPending={isReviewPending}
                    onRequestReview={onRequestReview}
                    isRequesting={isRequesting}
                    onIssueClick={setSelectedIssue}
                  />
                </div>
              )}
            </div>

            {/* Diff 뷰어 */}
            {files.map((file) => (
              <PRDiffViewer
                key={file.filename}
                file={file}
                isActive={selectedFile === file.filename}
                issues={issuesByFile.get(file.filename) ?? []}
                onIssueClick={setSelectedIssue}
              />
            ))}

            {/* 댓글 섹션 */}
            {commentSlot}
          </div>
        </div>
      </div>

      <IssueDetailModal issue={selectedIssue} onClose={() => setSelectedIssue(null)} />
    </>
  );
}
