import type Redis from "ioredis"
import { COLLABORATION_VOICE_LEASE_MS, COLLABORATION_VOICE_MAX_PARTICIPANTS } from "../lib/collaboration/voice-protocol"

export type VoiceSeatResult = "joined" | "existing" | "full" | "missing" | "duplicate" | "left"

export interface VoiceSeatStore {
  run(scope: string, roomId: string, action: "join" | "refresh" | "leave", userId: string, socketId: string): Promise<VoiceSeatResult>
}

const VOICE_SEAT_SCRIPT = `
local usersKey, socketsKey = KEYS[1], KEYS[2]
local action, userId, socketId, capacity, leaseMs = ARGV[1], ARGV[2], ARGV[3], tonumber(ARGV[4]), tonumber(ARGV[5])
local clock = redis.call('TIME')
local now = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
local expired = redis.call('ZRANGEBYSCORE', usersKey, '-inf', now)
for _, id in ipairs(expired) do
  redis.call('ZREM', usersKey, id)
  redis.call('HDEL', socketsKey, id)
end
local existing = redis.call('HGET', socketsKey, userId)
if action == 'join' then
  if existing and existing ~= socketId then return 'duplicate' end
  if not existing and redis.call('ZCARD', usersKey) >= capacity then return 'full' end
  redis.call('ZADD', usersKey, now + leaseMs, userId)
  redis.call('HSET', socketsKey, userId, socketId)
  redis.call('PEXPIRE', usersKey, leaseMs + 10000)
  redis.call('PEXPIRE', socketsKey, leaseMs + 10000)
  return existing and 'existing' or 'joined'
end
if not existing or existing ~= socketId then return 'missing' end
if action == 'refresh' then
  redis.call('ZADD', usersKey, now + leaseMs, userId)
  redis.call('PEXPIRE', usersKey, leaseMs + 10000)
  redis.call('PEXPIRE', socketsKey, leaseMs + 10000)
  return 'existing'
end
redis.call('ZREM', usersKey, userId)
redis.call('HDEL', socketsKey, userId)
return 'left'
`

export class RedisVoiceSeatStore implements VoiceSeatStore {
  constructor(private readonly redis: Redis) {}

  async run(scope: string, roomId: string, action: "join" | "refresh" | "leave", userId: string, socketId: string): Promise<VoiceSeatResult> {
    const key = `codemate:collaboration:voice:${scope}:${roomId}`
    return await this.redis.eval(
      VOICE_SEAT_SCRIPT, 2, `${key}:users`, `${key}:sockets`,
      action, userId, socketId, COLLABORATION_VOICE_MAX_PARTICIPANTS, COLLABORATION_VOICE_LEASE_MS
    ) as VoiceSeatResult
  }
}

export class MemoryVoiceSeatStore implements VoiceSeatStore {
  private readonly rooms = new Map<string, Map<string, { socketId: string; expiresAt: number }>>()

  async run(scope: string, roomId: string, action: "join" | "refresh" | "leave", userId: string, socketId: string): Promise<VoiceSeatResult> {
    const key = `${scope}:${roomId}`
    const now = Date.now()
    const room = this.rooms.get(key) ?? new Map<string, { socketId: string; expiresAt: number }>()
    for (const [id, seat] of room) if (seat.expiresAt <= now) room.delete(id)
    const existing = room.get(userId)
    if (action === "join") {
      if (existing && existing.socketId !== socketId) return "duplicate"
      if (!existing && room.size >= COLLABORATION_VOICE_MAX_PARTICIPANTS) return "full"
      room.set(userId, { socketId, expiresAt: now + COLLABORATION_VOICE_LEASE_MS })
      this.rooms.set(key, room)
      return existing ? "existing" : "joined"
    }
    if (!existing || existing.socketId !== socketId) return "missing"
    if (action === "refresh") {
      existing.expiresAt = now + COLLABORATION_VOICE_LEASE_MS
      return "existing"
    }
    room.delete(userId)
    if (room.size === 0) this.rooms.delete(key)
    return "left"
  }
}
