import { createHash } from "node:crypto"
import Redis from "ioredis"
import { NextResponse } from "next/server"

export type RateLimitPolicy = {
  scope: string
  limit: number
  windowMs: number
}

export type RateLimitResult = {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterMs: number
}

export const RATE_LIMIT_POLICIES = {
  repositoryConnect: { scope: "repository-connect", limit: 10, windowMs: 10 * 60_000 },
  repositorySync: { scope: "repository-sync", limit: 20, windowMs: 10 * 60_000 },
  aiReviewStart: { scope: "ai-review-start", limit: 5, windowMs: 10 * 60_000 },
  githubReviewPublish: { scope: "github-review-publish", limit: 10, windowMs: 10 * 60_000 },
  collaborationRoomCreate: { scope: "collaboration-room-create", limit: 10, windowMs: 10 * 60_000 },
  collaborationRoomJoin: { scope: "collaboration-room-join", limit: 30, windowMs: 10 * 60_000 },
  commentWrite: { scope: "comment-write", limit: 60, windowMs: 10 * 60_000 },
  reactionWrite: { scope: "reaction-write", limit: 120, windowMs: 10 * 60_000 },
} satisfies Record<string, RateLimitPolicy>

export class RateLimitUnavailableError extends Error {
  constructor(message = "Request rate limiting is unavailable") {
    super(message)
    this.name = "RateLimitUnavailableError"
  }
}

type MemoryEntry = { count: number; expiresAt: number }

const globalForRateLimit = globalThis as unknown as {
  rateLimitRedis?: Redis
  rateLimitMemory?: Map<string, MemoryEntry>
}

const memoryStore = globalForRateLimit.rateLimitMemory ?? new Map<string, MemoryEntry>()
if (process.env.NODE_ENV !== "production") {
  globalForRateLimit.rateLimitMemory = memoryStore
}

function identifierHash(identifier: string): string {
  return createHash("sha256").update(identifier).digest("base64url")
}

function rateLimitKey(policy: RateLimitPolicy, identifier: string): string {
  return `codemate:rate-limit:${policy.scope}:${identifierHash(identifier)}`
}

function checkMemoryRateLimit(
  key: string,
  policy: RateLimitPolicy,
  now = Date.now()
): RateLimitResult {
  const existing = memoryStore.get(key)
  const entry = !existing || existing.expiresAt <= now
    ? { count: 0, expiresAt: now + policy.windowMs }
    : existing

  entry.count += 1
  memoryStore.set(key, entry)

  return {
    allowed: entry.count <= policy.limit,
    limit: policy.limit,
    remaining: Math.max(0, policy.limit - entry.count),
    retryAfterMs: Math.max(1, entry.expiresAt - now),
  }
}

async function getRedis(): Promise<Redis> {
  const redisUrl = process.env.REDIS_URL?.trim()
  if (!redisUrl) throw new RateLimitUnavailableError("REDIS_URL is not configured")

  if (!globalForRateLimit.rateLimitRedis) {
    globalForRateLimit.rateLimitRedis = new Redis(redisUrl, {
      lazyConnect: true,
      family: 0,
      connectTimeout: 2_000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    })
    globalForRateLimit.rateLimitRedis.on("error", () => {
      // Callers receive a fail-closed 503 response; avoid logging connection details.
    })
  }

  const redis = globalForRateLimit.rateLimitRedis
  if (redis.status === "wait") await redis.connect()
  if (redis.status !== "ready") {
    throw new RateLimitUnavailableError()
  }

  return redis
}

const FIXED_WINDOW_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return { current, ttl }
`

export async function checkRateLimit(
  policy: RateLimitPolicy,
  identifier: string
): Promise<RateLimitResult> {
  const key = rateLimitKey(policy, identifier)

  if (process.env.NODE_ENV === "test") {
    if (process.env.RATE_LIMIT_TEST_MODE === "1") {
      return checkMemoryRateLimit(key, policy)
    }

    return {
      allowed: true,
      limit: policy.limit,
      remaining: policy.limit - 1,
      retryAfterMs: policy.windowMs,
    }
  }

  if (process.env.NODE_ENV !== "production" && !process.env.REDIS_URL) {
    return checkMemoryRateLimit(key, policy)
  }

  try {
    const redis = await getRedis()
    const result = await redis.eval(
      FIXED_WINDOW_SCRIPT,
      1,
      key,
      policy.windowMs
    ) as [number, number]
    const count = Number(result[0])
    const ttl = Number(result[1])

    return {
      allowed: count <= policy.limit,
      limit: policy.limit,
      remaining: Math.max(0, policy.limit - count),
      retryAfterMs: Math.max(1, ttl),
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) throw error
    throw new RateLimitUnavailableError()
  }
}

export async function enforceUserRateLimit(
  policy: RateLimitPolicy,
  userId: string
): Promise<NextResponse | null> {
  try {
    const result = await checkRateLimit(policy, userId)
    if (result.allowed) return null

    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": String(result.remaining),
        },
      }
    )
  } catch (error) {
    if (!(error instanceof RateLimitUnavailableError)) throw error

    return NextResponse.json(
      { error: "Request protection is temporarily unavailable." },
      { status: 503, headers: { "Retry-After": "5" } }
    )
  }
}

export function resetRateLimitStateForTests() {
  if (process.env.NODE_ENV === "test") memoryStore.clear()
}
