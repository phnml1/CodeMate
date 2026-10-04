import type Redis from "ioredis"
import {
  COLLABORATION_SOCKET_LEASE_MS,
  COLLABORATION_RECONNECT_GRACE_MS,
} from "../lib/collaboration/socket-token"
import type {
  CollaborationLocation,
  CollaborationPresenceSnapshot,
} from "../lib/socket/types"
import { syncCollaborationDisconnect } from "./disconnect-sync"

export {
  COLLABORATION_SOCKET_LEASE_MS,
  COLLABORATION_CRASH_CONVERGENCE_MS,
  COLLABORATION_PRESENCE_CONVERGENCE_MS,
} from "../lib/collaboration/socket-token"

type RemovedMember = { memberId: string; userId: string; disconnectedAt: number }

const DELETE_PENDING_IF_UNCHANGED = `
if redis.call('HGET', KEYS[1], ARGV[1]) == ARGV[2] then
  return redis.call('HDEL', KEYS[1], ARGV[1])
end
return 0
`

export type RedisPresenceResult = {
  ok: boolean
  changed: boolean
  presence: CollaborationPresenceSnapshot
  locations: CollaborationLocation[]
  clearedUserIds: string[]
  removed: RemovedMember[]
  serverTime: string
}

const PRESENCE_SCRIPT = `
local usersKey, membersKey, locationsKey, revisionKey, pendingKey = KEYS[1], KEYS[2], KEYS[3], KEYS[4], KEYS[5]
local base, action, userId, socketId = ARGV[1], ARGV[2], ARGV[3], ARGV[4]
local memberId, userName = ARGV[5], ARGV[6]
local capacity, locationJson = tonumber(ARGV[7]), ARGV[8]
local leaseMs, graceMs = tonumber(ARGV[9]), tonumber(ARGV[10])
local clock = redis.call('TIME')
local now = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
local ttl = leaseMs + graceMs + 60000
local removed, cleared = {}, {}
local changed = false

local function socketsKey(id)
  return base .. ':sockets:' .. id
end

local function clearLocation(id)
  if redis.call('HDEL', locationsKey, id) == 1 then
    table.insert(cleared, id)
  end
end

-- Every operation prunes expired seats before it makes a capacity decision.
local expired = redis.call('ZRANGEBYSCORE', usersKey, '-inf', now)
for _, id in ipairs(expired) do
  local data = redis.call('HGET', membersKey, id)
  local deadline = tonumber(redis.call('ZSCORE', usersKey, id))
  if data then
    local member = cjson.decode(data)
    local expiredMember = {
      memberId = member.memberId,
      userId = id,
      disconnectedAt = member.disconnectedAt > 0 and member.disconnectedAt or deadline - graceMs,
    }
    table.insert(removed, expiredMember)
    redis.call('HSET', pendingKey, member.memberId, cjson.encode(expiredMember))
  end
  redis.call('ZREM', usersKey, id)
  redis.call('HDEL', membersKey, id)
  redis.call('DEL', socketsKey(id))
  clearLocation(id)
  changed = true
end

local key = socketsKey(userId)
local ok = true
local memberJson = redis.call('HGET', membersKey, userId)
local member = memberJson and cjson.decode(memberJson) or nil

if action == 'join' then
  if not member and redis.call('ZCARD', usersKey) >= capacity then
    ok = false
  else
    member = member or {}
    member.memberId = memberId
    member.userId = userId
    member.userName = userName
    member.lastSeenAt = now
    member.disconnectedAt = 0
    member.lastDisconnectedSocketId = ''
    redis.call('ZREMRANGEBYSCORE', key, '-inf', now)
    redis.call('ZADD', key, now + leaseMs, socketId)
    redis.call('ZADD', usersKey, now + leaseMs + graceMs, userId)
    redis.call('HSET', membersKey, userId, cjson.encode(member))
    redis.call('PEXPIRE', key, ttl)
    changed = true
  end
elseif action == 'heartbeat' or action == 'check' or action == 'location' or action == 'clear' then
  local deadline = redis.call('ZSCORE', key, socketId)
  ok = member ~= nil and deadline ~= false and tonumber(deadline) > now
  if ok and action == 'heartbeat' then
    member.lastSeenAt = now
    redis.call('ZADD', key, now + leaseMs, socketId)
    redis.call('ZADD', usersKey, now + leaseMs + graceMs, userId)
    redis.call('HSET', membersKey, userId, cjson.encode(member))
    redis.call('PEXPIRE', key, ttl)
  elseif ok and action == 'location' then
    local location = cjson.decode(locationJson)
    location.updatedAt = now
    redis.call('HSET', locationsKey, userId, cjson.encode(location))
  elseif ok and action == 'clear' then
    clearLocation(userId)
  end
elseif action == 'leave' or action == 'disconnect' or action == 'unload' then
  local deadline = redis.call('ZSCORE', key, socketId)
  local active = member ~= nil and deadline ~= false and tonumber(deadline) > now
  local disconnectedMatch = action == 'unload' and member ~= nil
    and member.lastDisconnectedSocketId == socketId
    and redis.call('ZCOUNT', key, '(' .. now, '+inf') == 0
  ok = active or disconnectedMatch
  if active then
    redis.call('ZREM', key, socketId)
    redis.call('ZREMRANGEBYSCORE', key, '-inf', now)
  end
  if ok then
    local remaining = redis.call('ZCARD', key)
    if remaining == 0 and action == 'disconnect' then
      member.disconnectedAt = now
      member.lastDisconnectedSocketId = socketId
      redis.call('HSET', membersKey, userId, cjson.encode(member))
      redis.call('ZADD', usersKey, now + graceMs, userId)
    elseif remaining == 0 then
      redis.call('ZREM', usersKey, userId)
      redis.call('HDEL', membersKey, userId)
      redis.call('DEL', key)
      clearLocation(userId)
    else
      local latest = redis.call('ZREVRANGE', key, 0, 0, 'WITHSCORES')
      redis.call('ZADD', usersKey, tonumber(latest[2]) + graceMs, userId)
    end
    changed = true
  end
end

if changed then
  redis.call('INCR', revisionKey)
end
if changed or action == 'heartbeat' or action == 'location' then
  redis.call('PEXPIRE', usersKey, ttl)
  redis.call('PEXPIRE', membersKey, ttl)
  redis.call('PEXPIRE', locationsKey, ttl)
  redis.call('PEXPIRE', revisionKey, ttl)
  redis.call('PEXPIRE', pendingKey, ttl)
end

local users, locations = {}, {}
local ids = redis.call('ZRANGE', usersKey, 0, -1)
for _, id in ipairs(ids) do
  local data = redis.call('HGET', membersKey, id)
  if data then
    local current = cjson.decode(data)
    local socketKey = socketsKey(id)
    redis.call('ZREMRANGEBYSCORE', socketKey, '-inf', now)
    local socketCount = redis.call('ZCARD', socketKey)
    table.insert(users, {
      memberId = current.memberId,
      userId = id,
      userName = current.userName,
      lastSeenAt = current.lastSeenAt,
      socketCount = socketCount,
      status = socketCount > 0 and 'online' or 'reconnecting',
    })
    local location = redis.call('HGET', locationsKey, id)
    if location then table.insert(locations, cjson.decode(location)) end
  end
end

return cjson.encode({
  ok = ok,
  changed = changed,
  now = now,
  revision = tonumber(redis.call('GET', revisionKey) or '0'),
  users = users,
  locations = locations,
  removed = removed,
  cleared = cleared,
})
`

type ScriptResult = {
  ok: boolean
  changed: boolean
  now: number
  revision: number
  users: Array<{
    memberId: string
    userId: string
    userName: string
    lastSeenAt: number
    socketCount: number
    status: "online" | "reconnecting"
  }>
  locations: Array<Omit<CollaborationLocation, "updatedAt"> & { updatedAt: number }>
  removed: RemovedMember[]
  cleared: string[]
}

export class RedisPresenceStore {
  constructor(
    private readonly client: Redis,
    private readonly leaseMs = COLLABORATION_SOCKET_LEASE_MS,
    private readonly graceMs = COLLABORATION_RECONNECT_GRACE_MS
  ) {}

  async run(
    roomId: string,
    action: "snapshot" | "join" | "heartbeat" | "check" | "location" | "clear" | "leave" | "disconnect" | "unload",
    input: {
      userId?: string
      socketId?: string
      memberId?: string
      userName?: string
      capacity?: number
      location?: Omit<CollaborationLocation, "updatedAt">
    } = {}
  ): Promise<RedisPresenceResult> {
    const base = `codemate:collaboration:{${roomId}}`
    const raw = await this.client.eval(
      PRESENCE_SCRIPT,
      5,
      `${base}:users`,
      `${base}:members`,
      `${base}:locations`,
      `${base}:revision`,
      `${base}:pending-disconnect`,
      base,
      action,
      input.userId ?? "",
      input.socketId ?? "",
      input.memberId ?? "",
      input.userName ?? "",
      String(input.capacity ?? 0),
      JSON.stringify(input.location ?? null),
      String(this.leaseMs),
      String(this.graceMs)
    )
    if (typeof raw !== "string") throw new Error("Invalid Redis presence response")
    const result = JSON.parse(raw) as ScriptResult

    const removedMembers = Array.isArray(result.removed) ? result.removed : []
    const users = Array.isArray(result.users) ? result.users : []
    const locations = Array.isArray(result.locations) ? result.locations : []
    const clearedUserIds = Array.isArray(result.cleared) ? result.cleared : []

    return {
      ok: result.ok,
      changed: result.changed,
      presence: {
        roomId,
        generatedAt: new Date(result.now).toISOString(),
        revision: result.revision,
        users: users
          .map((user) => ({ ...user, lastSeenAt: new Date(user.lastSeenAt).toISOString() }))
          .sort((a, b) => a.userName.localeCompare(b.userName)),
      },
      locations: locations.map((location) => ({
        ...location,
        updatedAt: new Date(location.updatedAt).toISOString(),
      })),
      clearedUserIds,
      removed: removedMembers,
      serverTime: new Date(result.now).toISOString(),
    }
  }

  async reconcileExpired(onSnapshot: (result: RedisPresenceResult) => void) {
    const roomIds = new Set<string>()
    const pendingKeys = new Set<string>()
    let cursor = "0"
    do {
      const [nextCursor, keys] = await this.client.scan(
        cursor, "MATCH", "codemate:collaboration:{*}:*", "COUNT", 100
      )
      cursor = nextCursor
      for (const key of keys) {
        const match = /^codemate:collaboration:\{([^}]+)\}:(users|pending-disconnect)$/.exec(key)
        if (!match) continue
        if (match[2] === "users") roomIds.add(match[1])
        else pendingKeys.add(key)
      }
    } while (cursor !== "0")

    for (const roomId of roomIds) {
      onSnapshot(await this.run(roomId, "snapshot"))
      pendingKeys.add(`codemate:collaboration:{${roomId}}:pending-disconnect`)
    }

    for (const key of pendingKeys) {
      const roomId = /^codemate:collaboration:\{([^}]+)\}:pending-disconnect$/.exec(key)?.[1]
      if (!roomId) continue
      const entries = await this.client.hgetall(key)
      for (const [memberId, raw] of Object.entries(entries)) {
        try {
          const member = JSON.parse(raw) as RemovedMember
          await syncCollaborationDisconnect({ roomId, ...member })
          await this.client.eval(DELETE_PENDING_IF_UNCHANGED, 1, key, memberId, raw)
        } catch (error) {
          console.error("Collaboration disconnect reconciliation failed", error)
        }
      }
    }
  }

  async tryAcquireDbReconciliation() {
    return (await this.client.set(
      "codemate:collaboration:db-reconciliation-lock",
      String(Date.now()),
      "PX",
      55_000,
      "NX"
    )) === "OK"
  }
}
