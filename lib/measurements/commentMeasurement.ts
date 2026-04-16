import type { CommentWithAuthor } from "@/types/comment"

export type Strategy = "setQueryData" | "invalidate"

export type RunResult = {
  strategy: Strategy
  iterations: number
  requestCount: number
  cacheWriteCount: number
  renderCommitCount: number
  fetchingCommitCount: number
  totalActualDurationMs: number
  startedAt: string
  finishedAt: string
  durationMs: number
}

export type LatencyResult = {
  id: string
  iterations: number
  minMs: number
  maxMs: number
  avgMs: number
  p95Ms: number
  samples: number[]
  startedAt: string
  finishedAt: string
}

export type PendingLatencyEvent = {
  sentAt: number
  index: number
}

export const DEFAULT_ITERATIONS = 10
export const DEFAULT_DELAY_MS = 120
export const LATENCY_TIMEOUT_MS = 5000

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function makeSyntheticComment(
  prId: string,
  index: number,
  label: string
): CommentWithAuthor {
  const now = new Date().toISOString()

  return {
    id: `measurement-${label}-${Date.now()}-${index}`,
    content: `[measurement] ${label} event ${index + 1}`,
    lineNumber: null,
    filePath: null,
    isResolved: false,
    pullRequestId: prId,
    authorId: "measurement-user",
    parentId: null,
    mentions: [],
    reactions: {},
    createdAt: now,
    updatedAt: now,
    author: {
      id: "measurement-user",
      name: "Measurement",
      image: null,
    },
    replies: [],
  }
}

export async function fetchComments(prId: string, onRequest: () => void) {
  onRequest()

  const res = await fetch(`/api/pulls/${prId}/comments`, {
    cache: "no-store",
  })
  if (!res.ok) throw new Error("Failed to load comments.")

  const data = await res.json()
  return data.comments as CommentWithAuthor[]
}

function percentile(values: number[], p: number) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[index]
}

export function summarizeLatency(samples: number[]) {
  if (samples.length === 0) {
    return { minMs: 0, maxMs: 0, avgMs: 0, p95Ms: 0 }
  }

  const rounded = samples.map((value) => Number(value.toFixed(2)))
  const sum = rounded.reduce((acc, value) => acc + value, 0)

  return {
    minMs: Math.min(...rounded),
    maxMs: Math.max(...rounded),
    avgMs: Number((sum / rounded.length).toFixed(2)),
    p95Ms: Number(percentile(rounded, 95).toFixed(2)),
  }
}
