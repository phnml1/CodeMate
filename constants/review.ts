import type { AIReviewIssue } from "@/lib/ai/parsers";
import type { ReviewIssue } from "@/types/review";

type Severity = AIReviewIssue["severity"];
type Category = AIReviewIssue["category"];

// ─── ReviewBadge ──────────────────────────────────────────────────────────────

export const SEVERITY_STYLES: Record<Severity, string> = {
  HIGH: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  MEDIUM: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  LOW: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  BUG: "버그",
  PERFORMANCE: "성능",
  SECURITY: "보안",
  QUALITY: "품질",
  BEST_PRACTICE: "모범사례",
};

// ─── ReviewPanel ──────────────────────────────────────────────────────────────

export const SEVERITY_ORDER: Record<Severity, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

// ─── ReviewScore ──────────────────────────────────────────────────────────────

export const SCORE_RADIUS = 30;
export const SCORE_CIRCUMFERENCE = 2 * Math.PI * SCORE_RADIUS;

// ─── DiffTable ────────────────────────────────────────────────────────────────

export const ISSUE_ROW_CLASS: Record<ReviewIssue["severity"], string> = {
  HIGH: "outline outline-1 outline-red-300 dark:outline-red-800 bg-red-50/60 dark:bg-red-950/20",
  MEDIUM: "outline outline-1 outline-yellow-300 dark:outline-yellow-800 bg-yellow-50/60 dark:bg-yellow-950/20",
  LOW: "outline outline-1 outline-blue-200 dark:outline-blue-900 bg-blue-50/40 dark:bg-blue-950/10",
};

export const ISSUE_INLINE_CLASS: Record<ReviewIssue["severity"], string> = {
  HIGH: "border-red-400 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300",
  MEDIUM: "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300",
  LOW: "border-blue-400 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300",
};
