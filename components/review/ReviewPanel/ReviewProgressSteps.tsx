import { Loader2 } from "lucide-react";
import {
  getNormalizedReviewStage,
  getReviewStageIndex,
  REVIEW_PROGRESS_STEPS,
  REVIEW_STAGE_META,
} from "@/lib/reviewPanel";
import type { ReviewStage } from "@/types/review";

interface ReviewProgressStepsProps {
  stage: ReviewStage;
}

export default function ReviewProgressSteps({
  stage,
}: ReviewProgressStepsProps) {
  const normalizedStage = getNormalizedReviewStage(stage);
  const activeIndex = getReviewStageIndex(stage);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-5">
        {REVIEW_PROGRESS_STEPS.map((step, index) => {
          const isCompleted = activeIndex > index;
          const isActive = activeIndex === index;

          return (
            <div
              key={step}
              className={`rounded-2xl border px-3 py-3 transition-colors ${
                isCompleted
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300"
                  : isActive
                    ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-300"
                    : "border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    isCompleted
                      ? "bg-emerald-500 text-white"
                      : isActive
                        ? "bg-blue-500 text-white"
                        : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {isCompleted ? "✓" : index + 1}
                </span>
                <span className="text-xs font-semibold">
                  {REVIEW_STAGE_META[step].label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/50 dark:bg-blue-950/20">
        <div className="flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-blue-500" />
          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            {REVIEW_STAGE_META[normalizedStage].label}
          </span>
        </div>
        <p className="mt-1 text-sm text-blue-700/80 dark:text-blue-300/80">
          {REVIEW_STAGE_META[normalizedStage].description}
        </p>
      </div>
    </div>
  );
}
