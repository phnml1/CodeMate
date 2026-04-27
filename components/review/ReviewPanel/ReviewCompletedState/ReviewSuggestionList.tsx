import SuggestionCard from "@/components/review/SuggestionCard";
import type { ReviewIssue } from "@/types/review";

interface ReviewSuggestionListProps {
  issues: ReviewIssue[];
  onIssueClick?: (issue: ReviewIssue) => void;
}

export default function ReviewSuggestionList({
  issues,
  onIssueClick,
}: ReviewSuggestionListProps) {
  return (
    <div className="space-y-2">
      {issues.map((issue) => (
        <SuggestionCard
          key={issue.originalIndex}
          issue={issue}
          onIssueClick={onIssueClick}
        />
      ))}
    </div>
  );
}
