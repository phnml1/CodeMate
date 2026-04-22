import type { AIReviewIssue, AIReviewResponse } from "@/lib/ai/parsers";

// originalIndex: review.aiSuggestions.issues 배열에서의 원래 인덱스 (양방향 네비게이션용)
export type ReviewIssue = AIReviewIssue & { originalIndex: number };

export type ReviewStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
export type ReviewStage =
  | "QUEUED"
  | "FETCHING_FILES"
  | "ANALYZING"
  | "FINALIZING"
  | "COMPLETED"
  | "FAILED";
export type ReviewSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Review {
  id: string;
  pullRequestId: string;
  qualityScore: number;
  severity: ReviewSeverity;
  issueCount: number;
  status: ReviewStatus;
  stage: ReviewStage;
  failureReason?: string | null;
  aiSuggestions: AIReviewResponse;
  reviewedAt: string;
}
