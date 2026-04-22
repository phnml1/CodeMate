"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BotMessageSquare,
  CheckCircle,
  Loader2,
  RotateCcw,
} from "lucide-react";
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
  const [filterSeverity, setFilterSeverity] =
    useState<AIReviewIssue["severity"] | "ALL">("ALL");

  if (isPending) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">리뷰 데이터를 불러오는 중입니다...</span>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-10">
        <BotMessageSquare size={36} className="text-slate-300 dark:text-slate-600" />
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            AI 리뷰가 없습니다
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            AI가 이 PR의 코드를 분석하게 합니다
          </p>
        </div>
        <button
          type="button"
          onClick={onRequestReview}
          disabled={isRequesting}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
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

  if (review.status === "FAILED") {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-rose-100 p-2 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300">
              <AlertTriangle size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">
                AI 리뷰에 실패했습니다
              </p>
              <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">
                {review.failureReason ?? "원인을 확인할 수 없었습니다. 다시 시도해 주세요."}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onRequestReview}
          disabled={isRequesting}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          {isRequesting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              재시도 중...
            </>
          ) : (
            <>
              <RotateCcw size={14} />
              AI 리뷰 재시도
            </>
          )}
        </button>
      </div>
    );
  }

  if (review.status === "PENDING" || review.status === "IN_PROGRESS") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10">
        <Loader2 size={32} className="animate-spin text-blue-500" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          AI가 코드를 분석하고 있습니다...
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          잠시 후 결과가 표시됩니다
        </p>
      </div>
    );
  }

  const suggestions = review.aiSuggestions?.issues ?? [];
  const assessment = review.aiSuggestions?.overallAssessment;
  const summary = review.aiSuggestions?.summary;

  const indexedSuggestions: ReviewIssue[] = suggestions.map((issue, index) => ({
    ...issue,
    originalIndex: index,
  }));

  const filtered =
    filterSeverity === "ALL"
      ? indexedSuggestions
      : indexedSuggestions.filter((suggestion) => suggestion.severity === filterSeverity);

  const sorted = [...filtered].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );

  const counts = {
    HIGH: suggestions.filter((suggestion) => suggestion.severity === "HIGH").length,
    MEDIUM: suggestions.filter((suggestion) => suggestion.severity === "MEDIUM").length,
    LOW: suggestions.filter((suggestion) => suggestion.severity === "LOW").length,
  };

  const assessmentMeta = assessment ? ASSESSMENT_LABEL[assessment] : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <ReviewScore score={review.qualityScore} />
        {assessmentMeta && (
          <div
            className={`inline-flex items-center gap-1.5 text-sm font-semibold ${assessmentMeta.color}`}
          >
            {assessmentMeta.icon}
            {assessmentMeta.label}
          </div>
        )}
      </div>

      {summary && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            요약
          </p>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {summary}
          </p>
        </div>
      )}

      {suggestions.length > 0 && (
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              필터:
            </span>
            {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((severity) => {
              const count = severity === "ALL" ? suggestions.length : counts[severity];
              return (
                <button
                  key={severity}
                  type="button"
                  onClick={() => setFilterSeverity(severity)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    filterSeverity === severity
                      ? "border-slate-800 bg-slate-800 text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                  }`}
                >
                  {severity === "ALL" ? "전체" : severity} {count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            {sorted.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">
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
        <div className="flex flex-col items-center gap-2 py-8">
          <CheckCircle size={32} className="text-emerald-500" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            발견된 이슈가 없습니다
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            코드가 양호한 상태입니다.
          </p>
        </div>
      )}
    </div>
  );
}
