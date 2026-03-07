import type { AIReviewIssue } from "@/lib/ai/parsers";
import { SEVERITY_STYLES, CATEGORY_LABEL } from "@/constants/review";

type Severity = AIReviewIssue["severity"];
type Category = AIReviewIssue["category"];

interface ReviewBadgeProps {
  severity: Severity;
  category?: Category;
  className?: string;
}

export default function ReviewBadge({ severity, category, className = "" }: ReviewBadgeProps) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${SEVERITY_STYLES[severity]}`}
      >
        {severity}
      </span>
      {category && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
          {CATEGORY_LABEL[category]}
        </span>
      )}
    </div>
  );
}
