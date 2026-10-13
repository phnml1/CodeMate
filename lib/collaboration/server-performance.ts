import { AsyncLocalStorage } from "node:async_hooks"

type AuthQuery =
  | "sessionLookup"
  | "sessionRefresh"
  | "profileLookup"
const authTimingContext = new AsyncLocalStorage<ReturnType<typeof createCollaborationServerTimer>>()

export function createCollaborationServerTimer(event: string) {
  const enabled = process.env.COLLABORATION_PERF_LOGS === "1"
  const start = enabled ? performance.now() : 0
  let previous = start
  const phases: Record<string, number> = {}
  const details: Record<string, number> = {}

  const round = (duration: number) => Math.round(duration * 10) / 10

  return {
    enabled,
    checkpoint(name: string) {
      if (!enabled) return
      const now = performance.now()
      phases[name] = round(now - previous)
      previous = now
    },
    detail(name: string, duration: number) {
      if (!enabled) return
      details[name] = round((details[name] ?? 0) + duration)
    },
    async measure<T>(name: string, action: () => Promise<T>): Promise<T> {
      if (!enabled) return action()
      const startedAt = performance.now()
      try {
        return await action()
      } finally {
        details[name] = round((details[name] ?? 0) + performance.now() - startedAt)
      }
    },
    finish(outcome: string, roomId?: string) {
      if (!enabled) return null
      const totalMs = round(performance.now() - start)
      console.info(JSON.stringify({
        event,
        roomId,
        outcome,
        totalMs,
        phases,
        details,
        region: process.env.VERCEL_REGION ?? "local",
      }))
      return [...Object.entries(phases), ...Object.entries(details)]
        .map(([name, duration]) => `${name};dur=${duration}`)
        .join(", ")
    },
  }
}

export function timeCollaborationAuth<T>(
  timer: ReturnType<typeof createCollaborationServerTimer>,
  action: () => Promise<T>
) {
  return timer.enabled ? authTimingContext.run(timer, action) : action()
}

export async function timeCollaborationAuthQuery<T>(
  name: AuthQuery,
  action: () => Promise<T>
) {
  const timer = authTimingContext.getStore()
  if (!timer) return action()

  const start = performance.now()
  try {
    return await action()
  } finally {
    timer.detail(name, performance.now() - start)
  }
}
