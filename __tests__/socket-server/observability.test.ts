import { EventEmitter } from "events"
import type { ServerResponse } from "http"

describe("socket observability", () => {
  const originalLog = console.log
  const originalInfo = console.info
  const originalWarn = console.warn
  const originalError = console.error
  const originalPerfLogs = process.env.COLLABORATION_PERF_LOGS

  beforeEach(() => {
    jest.resetModules()
    console.log = jest.fn()
    console.info = jest.fn()
    console.warn = jest.fn()
    console.error = jest.fn()
  })

  afterEach(() => {
    console.log = originalLog
    console.info = originalInfo
    console.warn = originalWarn
    console.error = originalError
    if (originalPerfLogs === undefined) delete process.env.COLLABORATION_PERF_LOGS
    else process.env.COLLABORATION_PERF_LOGS = originalPerfLogs
  })

  it("records structured logs and socket metrics without message payloads", async () => {
    const observability = await import("@/socket-server/observability")

    observability.incrementActiveConnections(1)
    observability.recordJoinAttempt("room-1")
    observability.recordJoinAccepted("room-1", 12)
    observability.recordJoinRejected("room-2", "ROOM_FULL", 3)
    observability.recordRedisError("join", "room-3", new Error("redis down"))
    observability.recordBroadcast("collaboration:message", "room-1", Date.now() - 7, true)

    const snapshot = observability.getSocketMetrics()

    expect(snapshot.activeConnections).toBe(1)
    expect(snapshot.joins).toMatchObject({
      attempts: 1,
      accepted: 1,
      rejected: { ROOM_FULL: 1 },
    })
    expect(snapshot.redis.errors).toBe(1)
    expect(snapshot.broadcasts).toMatchObject({ total: 1, failed: 0 })

    const errorLog = (console.error as jest.Mock).mock.calls
      .map(([line]) => JSON.parse(line as string))
      .find((line) => line.event === "collaboration.redis.error")
    expect(errorLog).toMatchObject({
      service: "socket-server",
      event: "collaboration.redis.error",
      roomId: "room-3",
      operation: "join",
      error: { message: "redis down" },
    })
    expect(JSON.stringify((console.log as jest.Mock).mock.calls)).not.toContain("cross-node message")
  })

  it("times internal emit phases and correlates the saved message without logging its content", async () => {
    process.env.COLLABORATION_PERF_LOGS = "1"
    const { createInternalEmitTimer } = await import("@/socket-server/observability")
    const response = Object.assign(new EventEmitter(), { statusCode: 200 }) as ServerResponse
    const timer = createInternalEmitTimer(response)

    timer.checkpoint("authorize")
    timer.checkpoint("readiness")
    timer.checkpoint("parseBody")
    timer.checkpoint("validatePayload")
    timer.setPayload("collaboration:room-1", "collaboration:message", "message-1")
    timer.checkpoint("broadcast")
    response.emit("finish")
    response.emit("close")

    expect(console.info).toHaveBeenCalledTimes(1)
    const event = JSON.parse((console.info as jest.Mock).mock.calls[0][0])
    expect(event).toMatchObject({
      event: "collaboration.internal.emit.timing",
      roomId: "room-1",
      socketEvent: "collaboration:message",
      messageId: "message-1",
      outcome: "200",
    })
    expect(Object.keys(event.phases)).toEqual([
      "authorize", "readiness", "parseBody", "validatePayload", "broadcast", "responseFinish",
    ])
    expect(event.totalMs).toBeGreaterThanOrEqual(0)
    expect(JSON.stringify(event)).not.toContain("message content")
  })

  it("does not log internal emit timings when disabled", async () => {
    delete process.env.COLLABORATION_PERF_LOGS
    const { createInternalEmitTimer } = await import("@/socket-server/observability")
    const response = Object.assign(new EventEmitter(), { statusCode: 200 }) as ServerResponse
    const timer = createInternalEmitTimer(response)

    timer.checkpoint("authorize")
    timer.setPayload("collaboration:room-1", "collaboration:message", "message-1")
    response.emit("finish")

    expect(console.info).not.toHaveBeenCalled()
  })
})
