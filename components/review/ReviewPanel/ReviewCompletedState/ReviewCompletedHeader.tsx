import { Loader2, RotateCcw } from "lucide-react";
import ReviewScore from "@/components/review/ReviewScore";
import { ASSESSMENT_LABEL } from "@/lib/review-ui";
import type { Review } from "@/types/review";

interface ReviewCompletedHeaderProps {
  assessment: Review["aiSuggestions"]["overallAssessment"] | undefined;
  isRequesting: boolean;
  score: number;
  onRequestReview: () => void;
}

export default function ReviewCompletedHeader({
  assessment,
  isRequesting,
  score,
  onRequestReview,
}: ReviewCompletedHeaderProps) {
  const assessmentMeta = assessment ? ASSESSMENT_LABEL[assessment] : null;

  return (
    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
      <ReviewScore score={score} />
      <div className="flex flex-wrap items-center gap-2">
        {assessmentMeta && (
          <div
            className={`inline-flex items-center gap-1.5 text-sm font-semibold ${assessmentMeta.color}`}
          >
            {assessmentMeta.icon}
            {assessmentMeta.label}
          </div>
        )}
        <button
          type="button"
          onClick={onRequestReview}
          disabled={isRequesting}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {isRequesting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              AI 리뷰 다시 실행 중...
            </>
          ) : (
            <>
              <RotateCcw size={14} />
              AI 리뷰 다시 실행
            </>
          )}
        </button>
      </div>
    </div>
  );
}
