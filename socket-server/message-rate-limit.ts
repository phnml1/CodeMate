import { randomUUID } from "crypto"
import type Redis from "ioredis"

export const MESSAGE_RATE_LIMIT_WINDOW_MS = 10_000
export const MESSAGE_RATE_LIMIT_MAX = 10

export type MessageRateLimitResult = {
  allowed: boolean
  retryAfterMs: number
}

const RATE_LIMIT_SCRIPT = `
local key, limit, windowMs, messageId = KEYS[1], tonumber(ARGV[1]), tonumber(ARGV[2]), ARGV[3]
local clock = redis.call('TIME')
local now = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - windowMs)
if redis.call('ZSCORE', key, messageId) then
  return {1, 0}
end
if redis.call('ZCARD', key) >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  return {0, math.max(1, tonumber(oldest[2]) + windowMs - now)}
end
redis.call('ZADD', key, now, messageId)
redis.call('PEXPIRE', key, windowMs)
return {1, 0}
`

function messageKey(scope: string, userId: string) {
  return `codemate:collaboration:message-rate:${scope}:${userId}`
}

function messageMember(roomId: string, clientMessageId?: string) {
  return clientMessageId ? `${roomId}:${clientMessageId}` : randomUUID()
}

export class RedisMessageRateLimiter {
  constructor(private readonly redis: Redis) {}

  async check(scope: string, roomId: string, userId: string, clientMessageId?: string): Promise<MessageRateLimitResult> {
    const result = await this.redis.eval(
      RATE_LIMIT_SCRIPT,
      1,
      messageKey(scope, userId),
      MESSAGE_RATE_LIMIT_MAX,
      MESSAGE_RATE_LIMIT_WINDOW_MS,
      messageMember(roomId, clientMessageId)
    ) as [number, number]
    return { allowed: result[0] === 1, retryAfterMs: result[1] }
  }
}

export class MemoryMessageRateLimiter {
  private readonly entries = new Map<string, Map<string, number>>()
  private nextSweepAt = 0

  check(scope: string, roomId: string, userId: string, clientMessageId?: string): MessageRateLimitResult {
    const key = messageKey(scope, userId)
    const member = messageMember(roomId, clientMessageId)
    const now = Date.now()
    if (now >= this.nextSweepAt) {
      for (const [storedKey, storedEntries] of this.entries) {
        for (const [id, timestamp] of storedEntries) {
          if (timestamp <= now - MESSAGE_RATE_LIMIT_WINDOW_MS) storedEntries.delete(id)
        }
        if (storedEntries.size === 0) this.entries.delete(storedKey)
      }
      this.nextSweepAt = now + MESSAGE_RATE_LIMIT_WINDOW_MS
    }
    const entries = this.entries.get(key) ?? new Map<string, number>()
    for (const [id, timestamp] of entries) {
      if (timestamp <= now - MESSAGE_RATE_LIMIT_WINDOW_MS) entries.delete(id)
    }
    if (entries.has(member)) return { allowed: true, retryAfterMs: 0 }
    if (entries.size >= MESSAGE_RATE_LIMIT_MAX) {
      return { allowed: false, retryAfterMs: Math.max(1, Math.min(...entries.values()) + MESSAGE_RATE_LIMIT_WINDOW_MS - now) }
    }
    entries.set(member, now)
    this.entries.set(key, entries)
    return { allowed: true, retryAfterMs: 0 }
  }
}
