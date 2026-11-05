import type { ReviewStage } from "@/types/review";

export interface ReviewProgressDisplay {
  percentage: number;
  message: string;
}

export function getReviewProgressDisplay(
  stage: ReviewStage,
  startedAt: string,
  now: number,
  aiStartedAt?: string | null
): ReviewProgressDisplay {
  const startedAtMs = Date.parse(startedAt);
  const elapsedSeconds = Number.isFinite(startedAtMs)
    ? Math.max(0, Math.floor((now - startedAtMs) / 1000))
    : 0;
  const aiStartedAtMs = aiStartedAt ? Date.parse(aiStartedAt) : startedAtMs;
  const aiElapsedSeconds = Number.isFinite(aiStartedAtMs)
    ? Math.max(0, Math.floor((now - aiStartedAtMs) / 1000))
    : 0;
  const aiPercentage =
    aiElapsedSeconds <= 15
      ? 35 + aiElapsedSeconds * 2
      : aiElapsedSeconds <= 35
        ? 65 + (aiElapsedSeconds - 15)
        : Math.min(89, 85 + Math.floor((aiElapsedSeconds - 35) / 10));

  switch (stage) {
    case "QUEUED":
      return {
        percentage: Math.min(9, 5 + Math.floor(elapsedSeconds / 2)),
        message: "리뷰를 준비하는 중",
      };
    case "FETCHING_FILES":
      return {
        percentage: Math.min(29, 15 + Math.floor(elapsedSeconds * 1.5)),
        message: "PR 변경 파일과 diff를 가져오는 중",
      };
    case "ANALYZING":
      return {
        percentage: aiPercentage,
        message: "AI 응답을 기다리는 중",
      };
    case "FINALIZING":
      return { percentage: 95, message: "결과를 정리하는 중" };
    case "COMPLETED":
      return { percentage: 100, message: "AI 리뷰 완료" };
    case "FAILED":
      return { percentage: 0, message: "AI 리뷰 실패" };
  }
}
