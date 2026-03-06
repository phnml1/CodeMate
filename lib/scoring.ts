import type { AIReviewIssue } from "@/lib/ai/parsers"

const DEDUCTIONS: Record<AIReviewIssue["severity"], number> = {
  HIGH: 15,
  MEDIUM: 7,
  LOW: 3,
}

export type OverallSeverity = "HIGH" | "MEDIUM" | "LOW"

export interface ScoreResult {
  score: number
  overallSeverity: OverallSeverity
  issueCount: number
}

export function calculateScore(issues: AIReviewIssue[]): ScoreResult {
  const issueCount = issues.length

  const score = Math.max(
    0,
    issues.reduce((acc, issue) => acc - DEDUCTIONS[issue.severity], 100)
  )

  let overallSeverity: OverallSeverity = "LOW"
  if (issues.some((i) => i.severity === "HIGH")) {
    overallSeverity = "HIGH"
  } else if (issues.some((i) => i.severity === "MEDIUM")) {
    overallSeverity = "MEDIUM"
  }

  return { score, overallSeverity, issueCount }
}
