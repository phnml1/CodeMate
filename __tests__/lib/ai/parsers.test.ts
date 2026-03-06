import { parseAIReviewResponse } from "@/lib/ai/parsers"

const validResponse = {
  issues: [
    {
      filePath: "src/utils.ts",
      lineNumber: 42,
      severity: "HIGH",
      category: "BUG",
      title: "Null dereference",
      description: "value can be null",
      suggestion: "add null check",
      exampleCode: "if (value) { ... }",
    },
  ],
  summary: "1개의 심각한 버그가 발견되었습니다.",
  overallAssessment: "REQUEST_CHANGES",
}

describe("parseAIReviewResponse", () => {
  it("유효한 JSON 문자열을 파싱한다", () => {
    const result = parseAIReviewResponse(JSON.stringify(validResponse))

    expect(result.issues).toHaveLength(1)
    expect(result.issues[0].severity).toBe("HIGH")
    expect(result.summary).toBe("1개의 심각한 버그가 발견되었습니다.")
    expect(result.overallAssessment).toBe("REQUEST_CHANGES")
  })

  it("마크다운 ```json 코드 블록 안의 JSON을 파싱한다", () => {
    const text = "```json\n" + JSON.stringify(validResponse) + "\n```"
    const result = parseAIReviewResponse(text)

    expect(result.issues).toHaveLength(1)
    expect(result.overallAssessment).toBe("REQUEST_CHANGES")
  })

  it("마크다운 ``` 코드 블록 안의 JSON을 파싱한다", () => {
    const text = "```\n" + JSON.stringify(validResponse) + "\n```"
    const result = parseAIReviewResponse(text)

    expect(result.issues).toHaveLength(1)
  })

  it("JSON 앞뒤에 텍스트가 있어도 파싱한다", () => {
    const text = "Here is the review:\n" + JSON.stringify(validResponse) + "\nDone."
    const result = parseAIReviewResponse(text)

    expect(result.issues).toHaveLength(1)
  })

  it("잘못된 JSON이면 fallback을 반환한다", () => {
    const result = parseAIReviewResponse("not valid json at all")

    expect(result.issues).toHaveLength(0)
    expect(result.overallAssessment).toBe("COMMENT")
  })

  it("Zod 스키마 불일치 시 fallback을 반환한다", () => {
    const invalid = { ...validResponse, overallAssessment: "INVALID_VALUE" }
    const result = parseAIReviewResponse(JSON.stringify(invalid))

    expect(result.issues).toHaveLength(0)
    expect(result.overallAssessment).toBe("COMMENT")
  })

  it("빈 issues 배열도 정상 파싱한다", () => {
    const empty = { issues: [], summary: "문제 없음", overallAssessment: "APPROVE" }
    const result = parseAIReviewResponse(JSON.stringify(empty))

    expect(result.issues).toHaveLength(0)
    expect(result.overallAssessment).toBe("APPROVE")
  })

  it("lineNumber가 null인 이슈도 파싱한다", () => {
    const withNull = {
      ...validResponse,
      issues: [{ ...validResponse.issues[0], lineNumber: null }],
    }
    const result = parseAIReviewResponse(JSON.stringify(withNull))

    expect(result.issues[0].lineNumber).toBeNull()
  })
})
