import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompts"
import type { PRMeta } from "@/lib/ai/prompts"

const basePR: PRMeta = {
  title: "feat: 로그인 기능 추가",
  description: "GitHub OAuth를 이용한 로그인 구현",
  baseBranch: "main",
  headBranch: "feat/login",
  author: "octocat",
}

describe("SYSTEM_PROMPT", () => {
  it("5가지 분석 카테고리를 포함한다", () => {
    expect(SYSTEM_PROMPT).toContain("BUG")
    expect(SYSTEM_PROMPT).toContain("PERFORMANCE")
    expect(SYSTEM_PROMPT).toContain("SECURITY")
    expect(SYSTEM_PROMPT).toContain("QUALITY")
    expect(SYSTEM_PROMPT).toContain("BEST_PRACTICE")
  })

  it("3가지 severity 레벨을 포함한다", () => {
    expect(SYSTEM_PROMPT).toContain("HIGH")
    expect(SYSTEM_PROMPT).toContain("MEDIUM")
    expect(SYSTEM_PROMPT).toContain("LOW")
  })

  it("JSON 출력 스키마 필드를 포함한다", () => {
    expect(SYSTEM_PROMPT).toContain("filePath")
    expect(SYSTEM_PROMPT).toContain("lineNumber")
    expect(SYSTEM_PROMPT).toContain("title")
    expect(SYSTEM_PROMPT).toContain("description")
    expect(SYSTEM_PROMPT).toContain("suggestion")
    expect(SYSTEM_PROMPT).toContain("exampleCode")
    expect(SYSTEM_PROMPT).toContain("summary")
    expect(SYSTEM_PROMPT).toContain("overallAssessment")
  })

  it("overallAssessment 값을 포함한다", () => {
    expect(SYSTEM_PROMPT).toContain("APPROVE")
    expect(SYSTEM_PROMPT).toContain("REQUEST_CHANGES")
    expect(SYSTEM_PROMPT).toContain("COMMENT")
  })
})

describe("buildUserPrompt", () => {
  it("PR 메타정보를 프롬프트에 포함한다", () => {
    const prompt = buildUserPrompt(basePR, "- some diff")

    expect(prompt).toContain(basePR.title)
    expect(prompt).toContain(basePR.author)
    expect(prompt).toContain(basePR.baseBranch)
    expect(prompt).toContain(basePR.headBranch)
    expect(prompt).toContain(basePR.description!)
  })

  it("diff 텍스트를 프롬프트에 포함한다", () => {
    const diff = "+const x = 1\n-const x = 2"
    const prompt = buildUserPrompt(basePR, diff)

    expect(prompt).toContain(diff)
  })

  it("description이 null이면 (none)을 표시한다", () => {
    const pr: PRMeta = { ...basePR, description: null }
    const prompt = buildUserPrompt(pr, "diff")

    expect(prompt).toContain("(none)")
  })

  it("빈 diff도 정상 처리된다", () => {
    const prompt = buildUserPrompt(basePR, "")

    expect(prompt).toContain("PR Information")
    expect(prompt).toContain("Code Diff")
  })

  it("diff가 길어도 전체 내용이 포함된다", () => {
    const longDiff = Array.from({ length: 500 }, (_, i) => `+line ${i}`).join("\n")
    const prompt = buildUserPrompt(basePR, longDiff)

    expect(prompt).toContain("line 0")
    expect(prompt).toContain("line 499")
  })
})
