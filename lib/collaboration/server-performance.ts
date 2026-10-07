export function createCollaborationServerTimer(event: string) {
  const enabled = process.env.COLLABORATION_PERF_LOGS === "1"
  const start = enabled ? performance.now() : 0
  let previous = start
  const phases: Record<string, number> = {}

  return {
    checkpoint(name: string) {
      if (!enabled) return
      const now = performance.now()
      phases[name] = Math.round((now - previous) * 10) / 10
      previous = now
    },
    finish(outcome: string, roomId?: string) {
      if (!enabled) return null
      const totalMs = Math.round((performance.now() - start) * 10) / 10
      console.info(JSON.stringify({
        event,
        roomId,
        outcome,
        totalMs,
        phases,
      }))
      return Object.entries(phases)
        .map(([name, duration]) => `${name};dur=${duration}`)
        .join(", ")
    },
  }
}
