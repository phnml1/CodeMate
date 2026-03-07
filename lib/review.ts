// ─── ReviewScore 유틸 ─────────────────────────────────────────────────────────

export interface ScoreColors {
  text: string;
  ring: string;
  bg: string;
}

export function getScoreColor(score: number): ScoreColors {
  if (score >= 80) {
    return {
      text: "text-emerald-600 dark:text-emerald-400",
      ring: "stroke-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    };
  }
  if (score >= 60) {
    return {
      text: "text-yellow-600 dark:text-yellow-400",
      ring: "stroke-yellow-500",
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
    };
  }
  return {
    text: "text-red-600 dark:text-red-400",
    ring: "stroke-red-500",
    bg: "bg-red-50 dark:bg-red-900/20",
  };
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return "우수";
  if (score >= 60) return "보통";
  return "개선 필요";
}
