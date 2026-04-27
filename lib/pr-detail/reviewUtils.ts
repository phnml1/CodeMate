import { SEVERITY_ORDER } from "@/constants/review";
import type { AIReviewIssue } from "@/lib/ai/parsers";
import type { Review, ReviewIssue } from "@/types/review";

export type ReviewSeverityFilter = AIReviewIssue["severity"] | "ALL";

export function getIndexedReviewIssues(
  review: Review | null | undefined
): ReviewIssue[] {
  return (review?.aiSuggestions?.issues ?? []).map((issue, index) => ({
    ...issue,
    originalIndex: index,
  }));
}

export function groupIssuesByFile(issues: ReviewIssue[]) {
  const map = new Map<string, ReviewIssue[]>();

  for (const issue of issues) {
    const list = map.get(issue.filePath) ?? [];
    list.push(issue);
    map.set(issue.filePath, list);
  }

  return map;
}

export function groupIssuesByLine(issues: ReviewIssue[]) {
  const map = new Map<number, ReviewIssue[]>();

  for (const issue of issues) {
    if (issue.lineNumber != null) {
      const list = map.get(issue.lineNumber) ?? [];
      list.push(issue);
      map.set(issue.lineNumber, list);
    }
  }

  return map;
}

export function getIssueCountsBySeverity(issues: AIReviewIssue[]) {
  return {
    HIGH: issues.filter((issue) => issue.severity === "HIGH").length,
    MEDIUM: issues.filter((issue) => issue.severity === "MEDIUM").length,
    LOW: issues.filter((issue) => issue.severity === "LOW").length,
  };
}

export function filterAndSortReviewIssues(
  issues: ReviewIssue[],
  filterSeverity: ReviewSeverityFilter
) {
  const filtered =
    filterSeverity === "ALL"
      ? issues
      : issues.filter((issue) => issue.severity === filterSeverity);

  return [...filtered].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );
}
