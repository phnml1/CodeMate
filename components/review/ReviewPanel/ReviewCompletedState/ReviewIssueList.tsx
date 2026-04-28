import type { ReviewSeverityFilter } from "@/lib/reviewPanel";
import type { ReviewIssue } from "@/types/review";
import ReviewFilteredEmptyState from "./ReviewFilteredEmptyState";
import ReviewSeverityFilterBar from "./ReviewSeverityFilterBar";
import ReviewSuggestionList from "./ReviewSuggestionList";

interface ReviewIssueListProps {
  counts: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  filterSeverity: ReviewSeverityFilter;
  hasFilteredIssues: boolean;
  issues: ReviewIssue[];
  totalCount: number;
  onFilterChange: (severity: ReviewSeverityFilter) => void;
  onIssueClick?: (issue: ReviewIssue) => void;
}

export default function ReviewIssueList({
  counts,
  filterSeverity,
  hasFilteredIssues,
  issues,
  totalCount,
  onFilterChange,
  onIssueClick,
}: ReviewIssueListProps) {
  return (
    <div>
      <ReviewSeverityFilterBar
        counts={counts}
        filterSeverity={filterSeverity}
        totalCount={totalCount}
        onFilterChange={onFilterChange}
      />

      {hasFilteredIssues ? (
        <ReviewSuggestionList issues={issues} onIssueClick={onIssueClick} />
      ) : (
        <ReviewFilteredEmptyState />
      )}
    </div>
  );
}
