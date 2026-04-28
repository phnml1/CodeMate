import type { AIReviewIssue } from "@/lib/ai/parsers";
import {
  filterAndSortReviewIssues,
  getIndexedReviewIssues,
  getIssueCountsBySeverity,
} from "@/lib/pr-detail/reviewUtils";
import type { Review, ReviewStage } from "@/types/review";

export type ReviewSeverityFilter = AIReviewIssue["severity"] | "ALL";

export const REVIEW_STAGE_META: Record<
  ReviewStage,
  {
    label: string;
    description: string;
  }
> = {
  QUEUED: {
    label: "대기 중",
    description: "리뷰 작업을 준비하고 있습니다.",
  },
  FETCHING_FILES: {
    label: "파일 수집 중",
    description: "PR 변경 파일과 diff를 가져오고 있습니다.",
  },
  ANALYZING: {
    label: "AI 분석 중",
    description: "AI가 코드 변경 내용을 분석하고 있습니다.",
  },
  FINALIZING: {
    label: "결과 정리 중",
    description: "점수와 이슈 목록을 정리하고 있습니다.",
  },
  COMPLETED: {
    label: "완료",
    description: "리뷰 결과가 준비되었습니다.",
  },
  FAILED: {
    label: "실패",
    description: "리뷰를 완료하지 못했습니다.",
  },
};

export const REVIEW_PROGRESS_STEPS: ReviewStage[] = [
  "QUEUED",
  "FETCHING_FILES",
  "ANALYZING",
  "FINALIZING",
  "COMPLETED",
];

export function getNormalizedReviewStage(stage: ReviewStage) {
  return REVIEW_PROGRESS_STEPS.includes(stage) ? stage : "QUEUED";
}

export function getReviewStageIndex(stage: ReviewStage) {
  return REVIEW_PROGRESS_STEPS.indexOf(getNormalizedReviewStage(stage));
}

export function getCompletedReviewData(
  review: Review,
  filterSeverity: ReviewSeverityFilter
) {
  const suggestions = review.aiSuggestions?.issues ?? [];
  const indexedSuggestions = getIndexedReviewIssues(review);
  const sortedIssues = filterAndSortReviewIssues(
    indexedSuggestions,
    filterSeverity
  );

  return {
    suggestions,
    sortedIssues,
    counts: getIssueCountsBySeverity(suggestions),
    assessment: review.aiSuggestions?.overallAssessment,
    summary: review.aiSuggestions?.summary,
    hasSuggestions: suggestions.length > 0,
    hasFilteredIssues: sortedIssues.length > 0,
  };
}
