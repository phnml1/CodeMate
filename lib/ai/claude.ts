import Anthropic from "@anthropic-ai/sdk"

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error(
    "ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다. .env.local을 확인하세요."
  )
}

const globalForAnthropic = globalThis as unknown as {
  anthropic: Anthropic | undefined
}

export const anthropic =
  globalForAnthropic.anthropic ??
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

if (process.env.NODE_ENV !== "production") globalForAnthropic.anthropic = anthropic

export const CLAUDE_MODEL = "claude-sonnet-4-6"
