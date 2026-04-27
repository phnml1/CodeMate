import type { ReviewSeverityFilter } from "@/lib/reviewPanel";

interface ReviewSeverityFilterBarProps {
  counts: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  filterSeverity: ReviewSeverityFilter;
  totalCount: number;
  onFilterChange: (severity: ReviewSeverityFilter) => void;
}

export default function ReviewSeverityFilterBar({
  counts,
  filterSeverity,
  totalCount,
  onFilterChange,
}: ReviewSeverityFilterBarProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        필터:
      </span>
      {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((severity) => {
        const count = severity === "ALL" ? totalCount : counts[severity];

        return (
          <button
            key={severity}
            type="button"
            onClick={() => onFilterChange(severity)}
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
  );
}
