export const E2E_USER = {
  id: "user-e2e",
  email: "e2e@codemate.local",
  name: "E2E 사용자",
} as const

export const E2E_REPOSITORY = {
  id: "repo-e2e",
  githubId: BigInt("9100000001"),
  name: "codemate-e2e",
  fullName: "codemate/codemate-e2e",
} as const

export const E2E_PULL_REQUESTS = {
  navigation: {
    id: "pr-e2e-navigation",
    githubId: BigInt("9200000001"),
    number: 101,
    title: "E2E PR 상세 진입 검증",
  },
  comment: {
    id: "pr-e2e-comment",
    githubId: BigInt("9200000002"),
    number: 102,
    title: "E2E 댓글 작성 검증",
  },
  aiReview: {
    id: "pr-e2e-ai",
    githubId: BigInt("9200000003"),
    number: 103,
    title: "E2E AI 리뷰 검증",
  },
} as const

export const AUTH_STATE_PATH = ".auth/user.json"

export const E2E_AI_REVIEW = {
  id: "review-e2e-completed",
  pullRequestId: E2E_PULL_REQUESTS.aiReview.id,
  qualityScore: 86,
  severity: "MEDIUM",
  issueCount: 1,
  status: "COMPLETED",
  stage: "COMPLETED",
  reviewedAt: "2026-01-01T00:00:00.000Z",
  aiSuggestions: {
    summary: "입력 검증 경계를 명확히 하면 안정성이 좋아집니다.",
    overallAssessment: "COMMENT",
    issues: [
      {
        filePath: "app/api/example/route.ts",
        lineNumber: 12,
        severity: "MEDIUM",
        category: "QUALITY",
        title: "입력값 검증을 명시하세요",
        description: "요청 본문의 타입만 가정하고 런타임 검증을 하지 않습니다.",
        suggestion: "스키마 검증 후 비즈니스 로직을 실행하세요.",
        exampleCode: null,
      },
    ],
  },
} as const
