"use client";

import { useCallback, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import FloatingCommentsButton from "./FloatingCommentsButton";
import IssueModalHost from "./IssueModalHost";
import PRDetailStickyHeader from "./PRDetailStickyHeader";
import PRDiffSection from "./PRDiffSection";
import PRFileList from "./PRFileList";
import ReviewSection from "./ReviewSection";
import { usePRDetailDeepLink } from "@/hooks/pr-detail/usePRDetailDeepLink";
import { usePRDetailReset } from "@/hooks/pr-detail/usePRDetailReset";
import { useSocketRoom } from "@/hooks/useSocketRoom";
import { layoutStyles } from "@/lib/styles";
import { usePRDetailStore } from "@/stores/prDetailStore";
import type { ReviewIssue } from "@/types/review";

interface PRDetailLayoutProps {
  id: string;
  commentSlot: React.ReactNode;
  currentUserId: string;
}

export default function PRDetailLayout({
  id,
  commentSlot,
  currentUserId,
}: PRDetailLayoutProps) {
  const { sidebarCollapsed, setSidebarCollapsed } =
    usePRDetailStore(
      useShallow((state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        setSidebarCollapsed: state.setSidebarCollapsed,
      }))
    );
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<ReviewIssue | null>(null);

  useSocketRoom(id);
  usePRDetailReset(id);
  usePRDetailDeepLink(id);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setScrolled(el.scrollTop > 60);
  };

  const handleScrollToComments = () => {
    const el = scrollContainerRef.current;
    const target = document.getElementById("general-comments");
    if (!el || !target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleIssueClick = useCallback((issue: ReviewIssue) => {
    setSelectedIssue(issue);
  }, []);

  const handleIssueClose = useCallback(() => {
    setSelectedIssue(null);
  }, []);

  return (
    <div className={`${layoutStyles.detailFrame} relative`}>
      <PRFileList prId={id} />
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-white dark:bg-slate-950"
      >
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            aria-label="파일 목록 열기"
            className="absolute left-0 top-6 z-30 hidden rounded-r-lg border border-slate-200 bg-white p-2 shadow-md transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 md:block"
          >
            <ChevronRight size={16} />
          </button>
        )}

        <PRDetailStickyHeader
          prId={id}
          scrolled={scrolled}
        />

        <div className="space-y-4 p-4">
          <ReviewSection
            prId={id}
            onIssueClick={handleIssueClick}
          />

          <PRDiffSection
            prId={id}
            currentUserId={currentUserId}
            onIssueClick={handleIssueClick}
          />

          <div id="general-comments" className="scroll-mt-36">
            {commentSlot}
          </div>
        </div>

        <FloatingCommentsButton
          prId={id}
          visible={scrolled}
          onClick={handleScrollToComments}
        />

        <IssueModalHost
          issue={selectedIssue}
          onClose={handleIssueClose}
        />
      </div>
    </div>
  );
}
