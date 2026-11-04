"use client";

import { useEffect, useState } from "react";
import { getReviewProgressDisplay } from "@/lib/review-progress";
import type { ReviewStage } from "@/types/review";

interface ReviewProgressStateProps {
  stage: ReviewStage;
  startedAt: string;
  aiStartedAt?: string | null;
  compact?: boolean;
}

export default function ReviewProgressState({
  stage,
  startedAt,
  aiStartedAt,
  compact = false,
}: ReviewProgressStateProps) {
  const [progress, setProgress] = useState(() =>
    getReviewProgressDisplay(stage, startedAt, 0, aiStartedAt)
  );

  useEffect(() => {
    const update = () => {
      const next = getReviewProgressDisplay(
        stage,
        startedAt,
        Date.now(),
        aiStartedAt
      );
      setProgress((current) => ({
        ...next,
        percentage: Math.max(current.percentage, next.percentage),
      }));
    };
    const frame = window.requestAnimationFrame(update);
    const interval = window.setInterval(update, 1000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(interval);
    };
  }, [stage, startedAt, aiStartedAt]);

  const { percentage, message } = progress;

  if (compact) {
    return (
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-[10px]">
          <span className="font-medium text-slate-500">진행률</span>
          <span className="font-semibold tabular-nums text-blue-600">{percentage}%</span>
        </div>
        <div
          role="progressbar"
          aria-label="AI 리뷰 진행률"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
          className="h-1.5 overflow-hidden rounded-full bg-slate-200"
        >
          <div
            className="h-full rounded-full bg-blue-500 transition-[width] duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-xs text-slate-500" aria-live="polite">{message}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 py-8 text-center">
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          AI 리뷰 진행률
        </p>
        <p className="mt-2 text-5xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
          {percentage}%
        </p>
        <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200" aria-live="polite">
          {message}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="AI 리뷰 진행률"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
      >
        <div
          className="h-full rounded-full bg-blue-500 transition-[width] duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
