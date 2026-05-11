import { BotMessageSquare, Loader2 } from "lucide-react";

interface ReviewEmptyStateProps {
  isRequesting: boolean;
  requestError?: string | null;
  onRequestReview: () => void;
}

export default function ReviewEmptyState({
  isRequesting,
  requestError,
  onRequestReview,
}: ReviewEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-10">
      <BotMessageSquare
        size={36}
        className="text-slate-300 dark:text-slate-600"
      />
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          AI 리뷰가 아직 없습니다
        </p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          요청하면 AI가 이 PR을 분석해서 리뷰를 생성합니다.
        </p>
      </div>
      {requestError && (
        <p className="max-w-md rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-center text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          {requestError}
        </p>
      )}
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
