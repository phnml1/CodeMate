export type RenderCountSnapshot = Record<string, number>

type RenderMetricListener = () => void

const listeners = new Set<RenderMetricListener>()
const renderCounts = new Map<string, number>()

let manualMeasurementEnabled = false
let notifyScheduled = false

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
  scheduleNotify()
}

export function resetRenderCounts() {
  renderCounts.clear()
  scheduleNotify()
}

export function recordRender(metricId: string) {
  if (!isRenderMeasurementEnabled()) return

  renderCounts.set(metricId, (renderCounts.get(metricId) ?? 0) + 1)
  scheduleNotify()
}

export function getRenderCountSnapshot(): RenderCountSnapshot {
  return Object.fromEntries(
    [...renderCounts.entries()].sort(([left], [right]) => left.localeCompare(right))
  )
}

export function subscribeRenderCounts(listener: RenderMetricListener) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}
