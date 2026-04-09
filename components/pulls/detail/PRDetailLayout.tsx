"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronRight, ChevronDown, BotMessageSquare, MessageSquare } from "lucide-react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import PRFileList from "./PRFileList";
import PRDetailHeader from "./PRDetailHeader";
import FileIcon from "./FileIcon";
import { usePRDetailStore } from "@/stores/prDetailStore";
import { useComments } from "@/hooks/useComments";
import { useSocketRoom } from "@/hooks/useSocketRoom";
import { useInlineTypingIndicator } from "@/hooks/useInlineTypingIndicator";
import type { PRFile, PullRequest } from "@/types/pulls";
import type { Review, ReviewIssue } from "@/types/review";
import ReviewPanel from "@/components/review/ReviewPanel";

const PRDiffViewer = dynamic(() => import("./PRDiffViewer"), {
  ssr: false,
  loading: () => <Skeleton className="h-96 w-full rounded-lg" />,
});

const IssueDetailModal = dynamic(() => import("@/components/review/IssueDetailModal"), {
  ssr: false,
});

interface PRDetailLayoutProps {
  pr: PullRequest;
  files: PRFile[];
  review: Review | null | undefined;
  isReviewPending: boolean;
  onRequestReview: () => void;
  isRequesting?: boolean;
  commentSlot: React.ReactNode;
  currentUserId: string;
}

export default function PRDetailLayout({
  pr,
  files,
  review,
  isReviewPending,
  onRequestReview,
  isRequesting = false,
  commentSlot,
  currentUserId,
}: PRDetailLayoutProps) {
  const selectedFile = usePRDetailStore((s) => s.selectedFile);
  const sidebarCollapsed = usePRDetailStore((s) => s.sidebarCollapsed);
  const mobileFileOpen = usePRDetailStore((s) => s.mobileFileOpen);
  const selectFile = usePRDetailStore((s) => s.selectFile);
  const setSidebarCollapsed = usePRDetailStore((s) => s.setSidebarCollapsed);
  const setMobileFileOpen = usePRDetailStore((s) => s.setMobileFileOpen);
  const expandDiff = usePRDetailStore((s) => s.expandDiff);
  const reset = usePRDetailStore((s) => s.reset);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef<string | null>(null);
  const searchParams = useSearchParams();
  const [scrolled, setScrolled] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<ReviewIssue | null>(null);

  // 소켓 룸 조인 (레이아웃 레벨에서 보장)
  useSocketRoom(pr.id);

  // 전체 댓글 (인라인 + 일반) — 모든 PRDiffViewer와 PRFileList에 공유
  const { data: allComments = [] } = useComments(pr.id);

  // 인라인 타이핑 수신 (스티키 헤더에 표시)
  const { allInlineTyping: liveInlineTyping } = useInlineTypingIndicator(pr.id);
  const [visibleInlineTyping, setVisibleInlineTyping] = useState(liveInlineTyping);
  useEffect(() => {
    if (liveInlineTyping.length > 0) {
      setVisibleInlineTyping(liveInlineTyping);
    } else {
      const t = setTimeout(() => setVisibleInlineTyping([]), 500);
      return () => clearTimeout(t);
    }
  }, [liveInlineTyping]);
  // 파일별 인라인 댓글 맵
  const inlineCommentsByFile = useMemo(() => {
    const map: Record<string, typeof allComments> = {};
    for (const comment of allComments) {
      if (comment.filePath && comment.lineNumber != null) {
        map[comment.filePath] = map[comment.filePath] ?? [];
        map[comment.filePath].push(comment);
      }
    }
    return map;
  }, [allComments]);

  // 파일별 댓글 수 (PRFileList 배지용)
  const commentCountsByFile = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const [filename, comments] of Object.entries(inlineCommentsByFile)) {
      counts[filename] = comments.length;
    }
    return counts;
  }, [inlineCommentsByFile]);

  // 일반 댓글 수 (플로팅 버튼 배지용)
  const generalCommentCount = useMemo(
    () => allComments.filter((c) => c.filePath == null).length,
    [allComments]
  );

  useEffect(() => {
    reset(files[0]?.filename);
  }, [pr.id, files, reset]);

  // 쿼리 파라미터로 전달된 라인으로 스크롤
  useEffect(() => {
    const filePath = searchParams.get("filePath");
    const lineNumber = searchParams.get("lineNumber");
    const prId = pr.id;

    // 이미 처리했으면 스킵
    if (initializedRef.current === prId) return;

    if (!filePath || !lineNumber) {
      initializedRef.current = prId;
      return;
    }

    const lineNum = parseInt(lineNumber, 10);
    expandDiff(filePath);
    selectFile(filePath);
    setMobileFileOpen(false);

    const targetId = `diff-line-${filePath}-${lineNum}`;
    let attempts = 0;
    const tryScroll = () => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (attempts++ < 20) {
        requestAnimationFrame(tryScroll);
      }
    };
    requestAnimationFrame(tryScroll);

    initializedRef.current = prId;
  }, [pr.id, searchParams, expandDiff, selectFile, setMobileFileOpen]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setScrolled(el.scrollTop > 60);
  };

  const handleSelectFile = (filename: string) => {
    selectFile(filename);
    setMobileFileOpen(false);
    requestAnimationFrame(() => {
      document.getElementById(`diff-${filename}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };


  const handleScrollToComments = () => {
    const el = scrollContainerRef.current;
    const target = document.getElementById("general-comments");
    if (!el || !target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
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
          commentCountsByFile={commentCountsByFile}
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

          {/* Sticky top: 헤더 + 인라인 타이핑 배너 + 모바일 파일 드롭다운 */}
          <div className="sticky top-0 z-20">
            <PRDetailHeader pr={pr} scrolled={scrolled} />

            {/* 인라인 타이핑 알림 바 — 항상 보이는 위치 */}
            {visibleInlineTyping.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/50 px-4 py-1.5 flex items-center gap-3 flex-wrap">
                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                  💬 댓글 작성 중
                </span>
                {visibleInlineTyping.map((item) => (
                  <button
                    key={item.userId}
                    type="button"
                    onClick={() => {
                      const targetId = `diff-line-${item.filePath}-${item.lineNumber}`
                      expandDiff(item.filePath)
                      selectFile(item.filePath)
                      setMobileFileOpen(false)
                      let attempts = 0
                      const tryScroll = () => {
                        const el = document.getElementById(targetId);
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth", block: "center" })
                        } else if (attempts++ < 20) {
                          requestAnimationFrame(tryScroll)
                        }
                      }
                      requestAnimationFrame(tryScroll)
                    }}
                    className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 transition-colors cursor-pointer"
                    title={`${item.filePath}:${item.lineNumber} 으로 이동`}
                  >
                    <span className="font-semibold">{item.userName}</span>
                    <span className="opacity-60">→</span>
                    <code className="bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 px-1.5 py-0.5 rounded font-mono text-[9px] transition-colors">
                      {item.filePath.split("/").pop()}:{item.lineNumber}
                    </code>
                    <span className="flex items-end gap-0.5 ml-0.5">
                      <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce [animation-delay:300ms]" />
                    </span>
                  </button>
                ))}
              </div>
            )}

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
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${selectedFile === file.filename
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
                prId={pr.id}
                currentUserId={currentUserId}
                inlineComments={inlineCommentsByFile[file.filename] ?? []}
              />
            ))}

            {/* 댓글 섹션 */}
            <div id="general-comments" className="scroll-mt-36">
              {commentSlot}
            </div>
          </div>

          {/* 플로팅 댓글 버튼 */}
          {scrolled && (
            <button
              type="button"
              onClick={handleScrollToComments}
              className="fixed bottom-6 right-6 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-lg transition-all"
            >
              <MessageSquare size={15} />
              댓글
              {generalCommentCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-blue-600 text-[10px] font-black">
                  {generalCommentCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      <IssueDetailModal issue={selectedIssue} onClose={() => setSelectedIssue(null)} />
    </>
  );
}
