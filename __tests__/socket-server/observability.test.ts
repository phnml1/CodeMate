describe("socket observability", () => {
  const originalLog = console.log
  const originalInfo = console.info
  const originalWarn = console.warn
  const originalError = console.error

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
})
