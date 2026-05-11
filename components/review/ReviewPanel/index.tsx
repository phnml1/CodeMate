"use client";

import { usePRReviewActions } from "@/hooks/pr-detail/usePRReviewActions";
import {
  useReviewQuery,
  useReviewRealtimeInvalidation,
} from "@/hooks/useReview";
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
  useReviewRealtimeInvalidation(prId);
  const { requestReview, isRequesting, requestError } =
    usePRReviewActions(prId);

  if (isPending) {
    return <ReviewLoadingState />;
  }

  if (!review) {
    return (
      <ReviewEmptyState
        isRequesting={isRequesting}
        requestError={requestError}
        onRequestReview={requestReview}
      />
    );
  }

  if (review.status === "FAILED") {
    return (
      <ReviewFailedState
        review={review}
        isRequesting={isRequesting}
        requestError={requestError}
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
      requestError={requestError}
      onIssueClick={onIssueClick}
      onRequestReview={requestReview}
    />
  );
}
