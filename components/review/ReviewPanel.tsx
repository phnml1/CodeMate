"use client";

import { useState } from "react";
import { Loader2, BotMessageSquare, CheckCircle } from "lucide-react";
import type { Review, ReviewIssue } from "@/types/review";
import type { AIReviewIssue } from "@/lib/ai/parsers";
import { SEVERITY_ORDER } from "@/constants/review";
import { ASSESSMENT_LABEL } from "@/lib/review-ui";
import ReviewScore from "./ReviewScore";
import SuggestionCard from "./SuggestionCard";

interface ReviewPanelProps {
  review: Review | null | undefined;
  isPending: boolean;
  onRequestReview: () => void;
  isRequesting?: boolean;
  onIssueClick?: (issue: ReviewIssue) => void;
}

export default function ReviewPanel({
  review,
  isPending,
  onRequestReview,
  isRequesting = false,
  onIssueClick,
}: ReviewPanelProps) {
  const [filterSeverity, setFilterSeverity] = useState<AIReviewIssue["severity"] | "ALL">("ALL");

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">리뷰 데이터 로딩 중...</span>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4">
        <BotMessageSquare size={36} className="text-slate-300 dark:text-slate-600" />
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            AI 리뷰가 없습니다
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            AI가 이 PR의 코드를 분석하게 합니다
          </p>
        </div>
        <button
          type="button"
          onClick={onRequestReview}
          disabled={isRequesting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
        >
          {isRequesting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              분석 중...
            </>
          ) : (
            <>
              <BotMessageSquare size={14} />
              AI 리뷰 요청
            </>
          )}
        </button>
      </div>
    );
  }

  if (review.status === "PENDING" || review.status === "IN_PROGRESS") {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <Loader2 size={32} className="animate-spin text-blue-500" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          AI가 코드를 분석하고 있습니다...
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">잠시 후 결과가 표시됩니다</p>
      </div>
    );
  }

  const suggestions = review.aiSuggestions?.issues ?? [];
  const assessment = review.aiSuggestions?.overallAssessment;
  const summary = review.aiSuggestions?.summary;

  const indexedSuggestions: ReviewIssue[] = suggestions.map((issue, i) => ({ ...issue, originalIndex: i }));

  const filtered =
    filterSeverity === "ALL"
      ? indexedSuggestions
      : indexedSuggestions.filter((s) => s.severity === filterSeverity);

  const sorted = [...filtered].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );

  const counts = {
    HIGH: suggestions.filter((s) => s.severity === "HIGH").length,
    MEDIUM: suggestions.filter((s) => s.severity === "MEDIUM").length,
    LOW: suggestions.filter((s) => s.severity === "LOW").length,
  };

  const assessmentMeta = assessment ? ASSESSMENT_LABEL[assessment] : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <ReviewScore score={review.qualityScore} />
        {assessmentMeta && (
          <div className={`inline-flex items-center gap-1.5 text-sm font-semibold ${assessmentMeta.color}`}>
            {assessmentMeta.icon}
            {assessmentMeta.label}
          </div>
        )}
      </div>

      {summary && (
        <div className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
            요약
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{summary}</p>
        </div>
      )}

      {suggestions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">필터:</span>
            {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((sv) => {
              const count = sv === "ALL" ? suggestions.length : counts[sv];
              return (
                <button
                  key={sv}
                  type="button"
                  onClick={() => setFilterSeverity(sv)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                    filterSeverity === sv
                      ? "bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {sv === "ALL" ? "전체" : sv} {count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            {sorted.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                해당 심각도의 이슈가 없습니다.
              </p>
            ) : (
              sorted.map((issue) => (
                <SuggestionCard
                  key={issue.originalIndex}
                  issue={issue}
                  onIssueClick={onIssueClick}
                />
              ))
            )}
          </div>
        </div>
      )}

      {suggestions.length === 0 && review.status === "COMPLETED" && (
        <div className="flex flex-col items-center py-8 gap-2">
          <CheckCircle size={32} className="text-emerald-500" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            발견된 이슈가 없습니다
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">코드가 양호한 상태입니다.</p>
        </div>
      )}
    </div>
  );
}
