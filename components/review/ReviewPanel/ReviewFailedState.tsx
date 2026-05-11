import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import type { Review } from "@/types/review";

interface ReviewFailedStateProps {
  review: Review;
  isRequesting: boolean;
  requestError?: string | null;
  onRequestReview: () => void;
}

export default function ReviewFailedState({
  review,
  isRequesting,
  requestError,
  onRequestReview,
}: ReviewFailedStateProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-rose-100 p-2 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300">
            <AlertTriangle size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">
              AI 리뷰가 실패했습니다
            </p>
            <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">
              {review.failureReason ??
                "원인을 확인할 수 없습니다. 다시 시도해 주세요."}
            </p>
          </div>
        </div>
      </div>

      {requestError && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          {requestError}
        </p>
      )}

      <button
        type="button"
        onClick={onRequestReview}
        disabled={isRequesting}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
      >
        {isRequesting ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            다시 실행 중...
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
