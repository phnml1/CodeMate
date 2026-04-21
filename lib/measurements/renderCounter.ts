export type RenderCountSnapshot = Record<string, number>

type RenderMetricListener = () => void

const listeners = new Set<RenderMetricListener>()
const renderCounts = new Map<string, number>()
const emptySnapshot: RenderCountSnapshot = {}

let manualMeasurementEnabled = false
let notifyScheduled = false
let snapshotDirty = false
let cachedSnapshot: RenderCountSnapshot = emptySnapshot

function scheduleNotify() {
  if (notifyScheduled) return

  notifyScheduled = true
  queueMicrotask(() => {
    notifyScheduled = false
    listeners.forEach((listener) => listener())
  })
}

function hasRenderQueryFlag() {
  if (typeof window === "undefined") return false

  return new URLSearchParams(window.location.search).get("measureRenders") === "1"
}

export function isRenderMeasurementEnabled() {
  return manualMeasurementEnabled || hasRenderQueryFlag()
}

export function setRenderMeasurementEnabled(next: boolean) {
  manualMeasurementEnabled = next
  snapshotDirty = true
  scheduleNotify()
}

export function resetRenderCounts() {
  if (renderCounts.size === 0 && cachedSnapshot === emptySnapshot) return
  renderCounts.clear()
  snapshotDirty = true
  scheduleNotify()
}

export function recordRender(metricId: string) {
  if (!isRenderMeasurementEnabled()) return

  renderCounts.set(metricId, (renderCounts.get(metricId) ?? 0) + 1)
  snapshotDirty = true
  scheduleNotify()
}

export function getRenderCountSnapshot(): RenderCountSnapshot {
  if (!snapshotDirty) {
    return cachedSnapshot
  }

  if (renderCounts.size === 0) {
    cachedSnapshot = emptySnapshot
    snapshotDirty = false
    return cachedSnapshot
  }

  cachedSnapshot = Object.fromEntries(
    [...renderCounts.entries()].sort(([left], [right]) => left.localeCompare(right))
  )
  snapshotDirty = false

  return cachedSnapshot
}

export function subscribeRenderCounts(listener: RenderMetricListener) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}
