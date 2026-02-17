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
        },
      },
      security: [{ session: [] }],
    },
  })
  return spec
}
