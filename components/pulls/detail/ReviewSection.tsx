"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BotMessageSquare, ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";
import ReviewPanel from "@/components/review/ReviewPanel";
import { useReview } from "@/hooks/useReview";
import type { ReviewIssue } from "@/types/review";

const IssueDetailModal = dynamic(
  () => import("@/components/review/IssueDetailModal"),
  { ssr: false }
);

interface ReviewSectionProps {
  prId: string;
}

export default function ReviewSection({ prId }: ReviewSectionProps) {
  const { data: review } = useReview(prId);
  const searchParams = useSearchParams();
  const [reviewOpen, setReviewOpen] = useState(
    () => searchParams.get("review") === "open"
  );
  const [selectedIssue, setSelectedIssue] = useState<ReviewIssue | null>(null);

  useEffect(() => {
    if (searchParams.get("review") !== "open") return;

    const timer = window.setTimeout(() => setReviewOpen(true), 0);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setReviewOpen((value) => !value)}
          aria-expanded={reviewOpen}
          className="flex w-full items-center justify-between bg-slate-50 px-5 py-3 transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          <div className="flex items-center gap-2">
            <BotMessageSquare size={16} className="text-blue-500" />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              AI 코드 리뷰
            </span>
            {review?.issueCount != null && review.issueCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                {review.issueCount}개 이슈
              </span>
            )}
            {review?.status === "COMPLETED" && review.issueCount === 0 && (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                이슈 없음
              </span>
            )}
          </div>
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform duration-200 ${
              reviewOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        {reviewOpen && (
          <div className="p-4">
            <ReviewPanel
              prId={prId}
              onIssueClick={setSelectedIssue}
            />
          </div>
        )}
      </div>

      <IssueDetailModal
        issue={selectedIssue}
        onClose={() => setSelectedIssue(null)}
      />
    </>
  );
}
