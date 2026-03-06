import { z } from "zod"

const AIReviewIssueSchema = z.object({
  filePath: z.string(),
  lineNumber: z.number().nullable(),
  severity: z.enum(["HIGH", "MEDIUM", "LOW"]),
  category: z.enum(["BUG", "PERFORMANCE", "SECURITY", "QUALITY", "BEST_PRACTICE"]),
  title: z.string(),
  description: z.string(),
  suggestion: z.string(),
  exampleCode: z.string().nullable().optional(),
})

const AIReviewResponseSchema = z.object({
  issues: z.array(AIReviewIssueSchema),
  summary: z.string(),
  overallAssessment: z.enum(["APPROVE", "REQUEST_CHANGES", "COMMENT"]),
})

export type AIReviewIssue = z.infer<typeof AIReviewIssueSchema>
export type AIReviewResponse = z.infer<typeof AIReviewResponseSchema>

const FALLBACK: AIReviewResponse = {
  issues: [],
  summary: "파싱에 실패하여 리뷰 결과를 가져올 수 없습니다.",
  overallAssessment: "COMMENT",
}

function extractJson(text: string): string {
  // 마크다운 코드 블록 안의 JSON 추출 (```json ... ``` 또는 ``` ... ```)
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) return codeBlockMatch[1].trim()

  // 중괄호로 감싸진 첫 번째 JSON 객체 추출
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) return jsonMatch[0]

  return text.trim()
}

export function parseAIReviewResponse(text: string): AIReviewResponse {
  try {
    const json = extractJson(text)
    const parsed = JSON.parse(json)
    const result = AIReviewResponseSchema.safeParse(parsed)

    if (!result.success) {
      console.error("[parseAIReviewResponse] Zod validation failed:", result.error.flatten())
      return FALLBACK
    }

    return result.data
  } catch (err) {
    console.error("[parseAIReviewResponse] JSON parse failed:", err)
    return FALLBACK
  }
}
