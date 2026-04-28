"use client";

import { useState } from "react";
import {
  getCompletedReviewData,
  type ReviewSeverityFilter,
} from "@/lib/reviewPanel";
import type { Review, ReviewIssue } from "@/types/review";
import ReviewCompletedHeader from "./ReviewCompletedHeader";
import ReviewIssueList from "./ReviewIssueList";
import ReviewNoIssuesState from "./ReviewNoIssuesState";
import ReviewSummaryBox from "./ReviewSummaryBox";

interface ReviewCompletedStateProps {
  review: Review;
  isRequesting: boolean;
  onRequestReview: () => void;
  onIssueClick?: (issue: ReviewIssue) => void;
}

export default function ReviewCompletedState({
  review,
  isRequesting,
  onRequestReview,
  onIssueClick,
}: ReviewCompletedStateProps) {
  const [filterSeverity, setFilterSeverity] =
    useState<ReviewSeverityFilter>("ALL");
  const view = getCompletedReviewData(review, filterSeverity);

  return (
    <div className="space-y-4">
      <ReviewCompletedHeader
        assessment={view.assessment}
        isRequesting={isRequesting}
        score={review.qualityScore}
        onRequestReview={onRequestReview}
      />

      {view.summary && <ReviewSummaryBox summary={view.summary} />}

      {view.hasSuggestions ? (
        <ReviewIssueList
          counts={view.counts}
          filterSeverity={filterSeverity}
          hasFilteredIssues={view.hasFilteredIssues}
          issues={view.sortedIssues}
          totalCount={view.suggestions.length}
          onFilterChange={setFilterSeverity}
          onIssueClick={onIssueClick}
        />
      ) : (
        <ReviewNoIssuesState />
      )}
    </div>
  );
}
