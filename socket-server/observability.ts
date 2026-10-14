import { hostname } from "os"
import type { ServerResponse } from "http"
import type { CollaborationAckErrorCode, ServerToClientEventName } from "../lib/socket/types"

type LogLevel = "info" | "warn" | "error"
type MetricSample = { count: number; sumMs: number; maxMs: number }

type MetricSnapshot = {
  replicaId: string
  activeConnections: number
  joins: {
    attempts: number
    accepted: number
    rejected: Record<string, number>
    latencyMs: MetricSample
  }
  redis: {
    errors: number
  }
  broadcasts: {
    total: number
    failed: number
    latencyMs: MetricSample
  }
}

const replicaId =
  process.env.SOCKET_REPLICA_ID ??
  process.env.RAILWAY_REPLICA_ID ??
  process.env.RAILWAY_DEPLOYMENT_ID ??
  process.env.HOSTNAME ??
  hostname()

const metrics: MetricSnapshot = {
  replicaId,
  activeConnections: 0,
  joins: {
    attempts: 0,
    accepted: 0,
    rejected: {},
    latencyMs: { count: 0, sumMs: 0, maxMs: 0 },
  },
  redis: {
    errors: 0,
  },
  broadcasts: {
    total: 0,
    failed: 0,
    latencyMs: { count: 0, sumMs: 0, maxMs: 0 },
  },
}

function observe(sample: MetricSample, durationMs: number) {
  sample.count += 1
  sample.sumMs += durationMs
  sample.maxMs = Math.max(sample.maxMs, durationMs)
}

function serializeError(error: unknown) {
  if (!(error instanceof Error)) return undefined
  return { name: error.name, message: error.message }
}

export function logCollaborationEvent(
  event: string,
  fields: Record<string, unknown> = {},
  level: LogLevel = "info",
  error?: unknown
) {
  const payload = {
    ts: new Date().toISOString(),
    service: "socket-server",
    replicaId,
    event,
    ...fields,
    error: serializeError(error),
  }
  console[level](JSON.stringify(payload))
}

export function createInternalEmitTimer(res: ServerResponse): {
  checkpoint(name: string): void
  setPayload(room: string, event: ServerToClientEventName, messageId?: string): void
} {
  if (process.env.COLLABORATION_PERF_LOGS !== "1") {
    return {
      checkpoint() {},
      setPayload() {},
    }
  }

  const startedAt = performance.now()
  let previous = startedAt
  let roomId: string | undefined
  let socketEvent: ServerToClientEventName | undefined
  let messageId: string | undefined
  let finished = false
  const phases: Record<string, number> = {}
  const round = (ms: number) => Math.round(ms * 10) / 10

  const finish = (outcome: string) => {
    if (finished) return
    finished = true
    const now = performance.now()
    phases.responseFinish = round(now - previous)
    logCollaborationEvent("collaboration.internal.emit.timing", {
      roomId,
      socketEvent,
      messageId,
      outcome,
      totalMs: round(now - startedAt),
      phases,
    })
  }
  res.once("finish", () => finish(String(res.statusCode)))
  res.once("close", () => finish("closed"))

  return {
    checkpoint(name: string) {
      const now = performance.now()
      phases[name] = round(now - previous)
      previous = now
    },
    setPayload(room: string, event: ServerToClientEventName, id?: string) {
      roomId = room.startsWith("collaboration:") ? room.slice("collaboration:".length) : undefined
      socketEvent = event
      messageId = event === "collaboration:message" ? id : undefined
    },
  }
}

export function incrementActiveConnections(delta: 1 | -1) {
  metrics.activeConnections = Math.max(0, metrics.activeConnections + delta)
}

export function recordJoinAttempt(roomId?: string) {
  metrics.joins.attempts += 1
  logCollaborationEvent("collaboration.join.attempt", { roomId })
}

export function recordJoinAccepted(roomId: string, latencyMs: number) {
  metrics.joins.accepted += 1
  observe(metrics.joins.latencyMs, latencyMs)
  logCollaborationEvent("collaboration.join.accepted", { roomId, latencyMs })
}

export function recordJoinRejected(
  roomId: string | undefined,
  errorCode: CollaborationAckErrorCode,
  latencyMs: number
) {
  metrics.joins.rejected[errorCode] = (metrics.joins.rejected[errorCode] ?? 0) + 1
  observe(metrics.joins.latencyMs, latencyMs)
  logCollaborationEvent("collaboration.join.rejected", { roomId, errorCode, latencyMs }, "warn")
}

export function recordRedisError(operation: string, roomId: string | undefined, error: unknown) {
  metrics.redis.errors += 1
  logCollaborationEvent("collaboration.redis.error", { operation, roomId }, "error", error)
}

export function recordBroadcast(
  event: ServerToClientEventName,
  roomId: string | undefined,
  startedAt: number,
  ok: boolean,
  error?: unknown
) {
  const latencyMs = Date.now() - startedAt
  metrics.broadcasts.total += 1
  if (!ok) metrics.broadcasts.failed += 1
  observe(metrics.broadcasts.latencyMs, latencyMs)
  logCollaborationEvent(
    ok ? "collaboration.broadcast.sent" : "collaboration.broadcast.failed",
    { roomId, socketEvent: event, latencyMs },
    ok ? "info" : "error",
    error
  )
}

export function getSocketMetrics() {
  return JSON.parse(JSON.stringify(metrics)) as MetricSnapshot
}
