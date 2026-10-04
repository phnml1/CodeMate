import { createAdapter } from "@socket.io/redis-adapter"
import Redis from "ioredis"
import type { TypedServer } from "../lib/socket/types"
import { logCollaborationEvent, recordRedisError } from "./observability"
import { RedisPresenceStore } from "./redis-presence"

const REDIS_CONNECT_TIMEOUT_MS = 5_000

export type RedisAdapterConnection = {
  isReady: () => boolean
  close: () => void
  presence: RedisPresenceStore
}

async function connectWithTimeout(client: Redis) {
  let timeout: NodeJS.Timeout | undefined
  try {
    await Promise.race([
      client.connect(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Redis connection timed out")), REDIS_CONNECT_TIMEOUT_MS)
      }),
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

export async function attachRedisAdapter(
  io: TypedServer,
  redisUrl = process.env.REDIS_URL,
  onUnavailable?: () => void
): Promise<RedisAdapterConnection | null> {
  if (redisUrl === undefined) return null
  if (!redisUrl.trim()) throw new Error("REDIS_URL is empty")

  const publisher = new Redis(redisUrl, {
    lazyConnect: true,
    family: 0,
    connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
    maxRetriesPerRequest: 1,
  })
  const subscriber = publisher.duplicate()
  publisher.on("error", (error) => recordRedisError("adapter.publisher", undefined, error))
  subscriber.on("error", (error) => recordRedisError("adapter.subscriber", undefined, error))
  publisher.on("close", () => onUnavailable?.())
  subscriber.on("close", () => onUnavailable?.())

  try {
    await Promise.all([connectWithTimeout(publisher), connectWithTimeout(subscriber)])
    io.adapter(createAdapter(publisher, subscriber, { key: "codemate:socket.io" }))
    logCollaborationEvent("collaboration.redis.adapter.ready")
    return {
      isReady: () => publisher.status === "ready" && subscriber.status === "ready",
      presence: new RedisPresenceStore(publisher),
      close: () => {
        publisher.disconnect()
        subscriber.disconnect()
      },
    }
  } catch (error) {
    publisher.disconnect()
    subscriber.disconnect()
    throw error
  }
}
