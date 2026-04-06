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
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)```/)
  if (jsonBlockMatch) return jsonBlockMatch[1].trim()

  const start = text.indexOf("{")
  if (start !== -1) {
    let depth = 0
    let inString = false
    let escape = false
    for (let i = start; i < text.length; i++) {
      const ch = text[i]
      if (escape) { escape = false; continue }
      if (ch === "\\" && inString) { escape = true; continue }
      if (ch === '"') { inString = !inString; continue }
      if (inString) continue
      if (ch === "{") depth++
      else if (ch === "}") { depth--; if (depth === 0) return text.slice(start, i + 1) }
    }
    return text.slice(start)
  }

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
