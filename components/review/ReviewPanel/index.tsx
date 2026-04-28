"use client";

import { usePRReviewActions } from "@/hooks/pr-detail/usePRReviewActions";
import { useReviewQuery } from "@/hooks/useReview";
import type { ReviewIssue } from "@/types/review";
import ReviewCompletedState from "./ReviewCompletedState";
import ReviewEmptyState from "./ReviewEmptyState";
import ReviewFailedState from "./ReviewFailedState";
import ReviewLoadingState from "./ReviewLoadingState";
import ReviewProgressState from "./ReviewProgressState";

interface ReviewPanelProps {
  prId: string;
  onIssueClick?: (issue: ReviewIssue) => void;
}

export default function ReviewPanel({ prId, onIssueClick }: ReviewPanelProps) {
  const { data: review, isPending } = useReviewQuery(prId);
  const { requestReview, isRequesting } = usePRReviewActions(prId);

  if (isPending) {
    return <ReviewLoadingState />;
  }

  if (!review) {
    return (
      <ReviewEmptyState
        isRequesting={isRequesting}
        onRequestReview={requestReview}
      />
    );
  }

  if (review.status === "FAILED") {
    return (
      <ReviewFailedState
        review={review}
        isRequesting={isRequesting}
        onRequestReview={requestReview}
      />
    );
  }

  if (review.status === "PENDING" || review.status === "IN_PROGRESS") {
    return <ReviewProgressState stage={review.stage} />;
  }

  return (
    <ReviewCompletedState
      review={review}
      isRequesting={isRequesting}
      onIssueClick={onIssueClick}
      onRequestReview={requestReview}
    />
  );
}
