import {
  createCollaborationServerTimer,
  timeCollaborationAuth,
  timeCollaborationAuthQuery,
} from "@/lib/collaboration/server-performance"

describe("collaboration server performance timing", () => {
  const previousPerfLogs = process.env.COLLABORATION_PERF_LOGS

  afterEach(() => {
    if (previousPerfLogs === undefined) delete process.env.COLLABORATION_PERF_LOGS
    else process.env.COLLABORATION_PERF_LOGS = previousPerfLogs
    jest.restoreAllMocks()
  })

  it("does not emit timings when disabled", async () => {
    delete process.env.COLLABORATION_PERF_LOGS
    const log = jest.spyOn(console, "info").mockImplementation(() => {})
    const timer = createCollaborationServerTimer("collaboration.test")

    const value = await timeCollaborationAuth(timer, () =>
      timeCollaborationAuthQuery("sessionLookup", async () => "session")
    )
    timer.checkpoint("auth")

    expect(value).toBe("session")
    expect(timer.finish("ok")).toBeNull()
    expect(log).not.toHaveBeenCalled()
  })

  it("keeps nested authentication query timings scoped to each request", async () => {
    process.env.COLLABORATION_PERF_LOGS = "1"
    const log = jest.spyOn(console, "info").mockImplementation(() => {})
    const first = createCollaborationServerTimer("collaboration.first")
    const second = createCollaborationServerTimer("collaboration.second")

    await Promise.all([
      timeCollaborationAuth(first, async () => {
        await timeCollaborationAuthQuery("sessionLookup", async () => {
          await Promise.resolve()
          return "first"
        })
        return timeCollaborationAuthQuery("sessionRefresh", async () => "refreshed")
      }),
      timeCollaborationAuth(second, () =>
        timeCollaborationAuthQuery("profileLookup", async () => {
          await Promise.resolve()
          return "second"
        })
      ),
    ])
    first.checkpoint("auth")
    second.checkpoint("auth")
    first.finish("ok")
    second.finish("ok")

    const firstEvent = JSON.parse(log.mock.calls[0][0])
    const secondEvent = JSON.parse(log.mock.calls[1][0])
    expect(firstEvent.details).toHaveProperty("sessionLookup")
    expect(firstEvent.details).toHaveProperty("sessionRefresh")
    expect(firstEvent.details).not.toHaveProperty("profileLookup")
    expect(secondEvent.details).toHaveProperty("profileLookup")
    expect(secondEvent.details).not.toHaveProperty("sessionLookup")
  })
})
