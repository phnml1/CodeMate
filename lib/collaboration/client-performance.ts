const STORAGE_KEY = "codemate:collaboration-perf"
const PREFIX = "collaboration."

function enabled() {
  if (typeof window === "undefined") return false
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

export function markCollaborationPerformance(name: string) {
  if (enabled()) performance.mark(`${PREFIX}${name}`)
}

export function observeCollaborationLoading() {
  if (!enabled()) return
  const observer = new MutationObserver(() => {
    const loading = document.querySelector('[data-collaboration-loading="true"]')
    if (!loading) return
    observer.disconnect()
    clearTimeout(timeout)
    markCollaborationPerformance("loading.commit")
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (loading.isConnected) markCollaborationPerformance("loading.paint-proxy")
    }))
  })
  observer.observe(document.body, { childList: true, subtree: true })
  const timeout = setTimeout(() => observer.disconnect(), 30_000)
}

export function measureCollaborationPerformance<T>(name: string, run: () => T): T {
  if (!enabled()) return run()
  const start = performance.now()
  try {
    return run()
  } finally {
    performance.measure(`${PREFIX}${name}`, { start, end: performance.now() })
  }
}
