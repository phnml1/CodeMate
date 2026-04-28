interface ReviewSummaryBoxProps {
  summary: string;
}

export default function ReviewSummaryBox({ summary }: ReviewSummaryBoxProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        요약
      </p>
      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {summary}
      </p>
    </div>
  );
}
