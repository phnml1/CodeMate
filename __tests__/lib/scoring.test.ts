import { calculateScore } from "@/lib/scoring"
import type { AIReviewIssue } from "@/lib/ai/parsers"

const makeIssue = (severity: AIReviewIssue["severity"]): AIReviewIssue => ({
  filePath: "src/file.ts",
  lineNumber: 1,
  severity,
  category: "BUG",
  title: "title",
  description: "desc",
  suggestion: "fix it",
})

describe("calculateScore", () => {
  it("이슈 없음 → 점수 100, severity LOW", () => {
    const result = calculateScore([])

    expect(result.score).toBe(100)
    expect(result.overallSeverity).toBe("LOW")
    expect(result.issueCount).toBe(0)
  })

  it("HIGH 이슈 1개 → 점수 85, severity HIGH", () => {
    const result = calculateScore([makeIssue("HIGH")])

    expect(result.score).toBe(85)
    expect(result.overallSeverity).toBe("HIGH")
  })

  it("MEDIUM 이슈 1개 → 점수 93, severity MEDIUM", () => {
    const result = calculateScore([makeIssue("MEDIUM")])

    expect(result.score).toBe(93)
    expect(result.overallSeverity).toBe("MEDIUM")
  })

  it("LOW 이슈 1개 → 점수 97, severity LOW", () => {
    const result = calculateScore([makeIssue("LOW")])

    expect(result.score).toBe(97)
    expect(result.overallSeverity).toBe("LOW")
  })

  it("HIGH 이슈 7개 → 점수 0 (음수 방지)", () => {
    const issues = Array.from({ length: 7 }, () => makeIssue("HIGH"))
    const result = calculateScore(issues)

    expect(result.score).toBe(0)
  })

  it("혼합 이슈 (HIGH 1 + MEDIUM 2 + LOW 1) → 점수 72", () => {
    // 100 - 15 - 7 - 7 - 3 = 68
    const issues = [
      makeIssue("HIGH"),
      makeIssue("MEDIUM"),
      makeIssue("MEDIUM"),
      makeIssue("LOW"),
    ]
    const result = calculateScore(issues)

    expect(result.score).toBe(68)
    expect(result.overallSeverity).toBe("HIGH")
    expect(result.issueCount).toBe(4)
  })

  it("MEDIUM + LOW만 있으면 severity MEDIUM", () => {
    const issues = [makeIssue("MEDIUM"), makeIssue("LOW")]
    const result = calculateScore(issues)

    expect(result.overallSeverity).toBe("MEDIUM")
  })

  it("LOW만 있으면 severity LOW", () => {
    const issues = [makeIssue("LOW"), makeIssue("LOW")]
    const result = calculateScore(issues)

    expect(result.overallSeverity).toBe("LOW")
  })

  it("issueCount가 정확히 반환된다", () => {
    const issues = [makeIssue("HIGH"), makeIssue("LOW"), makeIssue("MEDIUM")]
    const result = calculateScore(issues)

    expect(result.issueCount).toBe(3)
  })
})
