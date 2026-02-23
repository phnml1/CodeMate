import { createSwaggerSpec } from "next-swagger-doc"

export function getApiDocs() {
  const spec = createSwaggerSpec({
    apiFolder: "app/api",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "CodeMate API",
        version: "1.0.0",
        description:
          "CodeMate - AI 기반 코드 리뷰 & 협업 플랫폼 API 문서",
      },
      components: {
        securitySchemes: {
          session: {
            type: "apiKey",
            in: "cookie",
            name: "next-auth.session-token",
            description: "NextAuth 세션 쿠키 (GitHub OAuth 로그인 필요)",
          },
        },
        schemas: {
          Repository: {
            type: "object",
            properties: {
              id: { type: "string", description: "DB ID (cuid)" },
              githubId: { type: "integer", description: "GitHub Repository ID" },
              name: { type: "string", description: "Repository 이름" },
              fullName: { type: "string", description: "owner/repo 형식" },
              description: { type: "string", nullable: true },
              language: { type: "string", nullable: true },
              isActive: { type: "boolean", description: "활성 상태" },
              webhookId: { type: "integer", nullable: true },
              userId: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
          GitHubRepo: {
            type: "object",
            properties: {
              id: { type: "integer", description: "GitHub Repository ID" },
              name: { type: "string" },
              fullName: { type: "string" },
              language: { type: "string", nullable: true },
              isConnected: { type: "boolean", description: "CodeMate 연동 여부" },
            },
          },
          Error: {
            type: "object",
            properties: {
              error: { type: "string", description: "에러 메시지" },
            },
          },
          Message: {
            type: "object",
            properties: {
              message: { type: "string", description: "응답 메시지" },
            },
          },
          PullRequest: {
            type: "object",
            properties: {
              id: { type: "string", description: "DB ID (cuid)" },
              githubId: { type: "integer", description: "GitHub PR ID" },
              number: { type: "integer", description: "PR 번호" },
              title: { type: "string", description: "PR 제목" },
              description: { type: "string", nullable: true },
              status: {
                type: "string",
                enum: ["OPEN", "CLOSED", "MERGED", "DRAFT"],
                description: "PR 상태",
              },
              baseBranch: { type: "string" },
              headBranch: { type: "string" },
              additions: { type: "integer", description: "추가된 라인 수" },
              deletions: { type: "integer", description: "삭제된 라인 수" },
              changedFiles: { type: "integer", description: "변경된 파일 수" },
              repoId: { type: "string" },
              repo: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  fullName: { type: "string" },
                },
              },
              mergedAt: { type: "string", format: "date-time", nullable: true },
              closedAt: { type: "string", format: "date-time", nullable: true },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
        },
      },
      security: [{ session: [] }],
    },
  })
  return spec
}
