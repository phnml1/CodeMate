"use client"

export const SOCKET_METRIC_EVENTS = [
  "comment:new",
  "comment:updated",
  "comment:deleted",
  "comment:reaction-updated",
  "notification:new",
  "typing:start",
  "typing:stop",
  "inline:typing:start",
  "inline:typing:stop",
] as const

export type SocketMetricEvent = (typeof SOCKET_METRIC_EVENTS)[number]

type CounterMap = Record<string, number>

type SocketMetricsStore = {
  startedAt: string
  updatedAt: string
  socketCreates: number
  connectCalls: number
  connects: number
  disconnects: number
  connectErrors: number
  activeConnections: number
  peakConnections: number
  roomJoins: number
  roomLeaves: number
  currentRoomSubscriptions: number
  peakRoomSubscriptions: number
  activeRooms: CounterMap
  peakRooms: CounterMap
  activeHandlers: CounterMap
  peakHandlers: CounterMap
  handlerInvocations: CounterMap
  reconnectSamplesMs: number[]
  lastDisconnectAt: number | null
  lastErrorMessage: string | null
}

export type SocketMetricsSnapshot = SocketMetricsStore & {
  roomBalance: number
  reconnectCount: number
  reconnectAvgMs: number | null
  reconnectP95Ms: number | null
  reconnectMaxMs: number | null
}

const SOCKET_METRICS_KEY = "__codeMateSocketMetrics"

function createCounterMap(): CounterMap {
  return Object.fromEntries(SOCKET_METRIC_EVENTS.map((event) => [event, 0]))
}

function createStore(): SocketMetricsStore {
  const now = new Date().toISOString()

  return {
    startedAt: now,
    updatedAt: now,
    socketCreates: 0,
    connectCalls: 0,
    connects: 0,
    disconnects: 0,
    connectErrors: 0,
    activeConnections: 0,
    peakConnections: 0,
    roomJoins: 0,
    roomLeaves: 0,
    currentRoomSubscriptions: 0,
    peakRoomSubscriptions: 0,
    activeRooms: {},
    peakRooms: {},
    activeHandlers: createCounterMap(),
    peakHandlers: createCounterMap(),
    handlerInvocations: createCounterMap(),
    reconnectSamplesMs: [],
    lastDisconnectAt: null,
    lastErrorMessage: null,
  }
}

function getMetricsWindow():
  | (Window & { [SOCKET_METRICS_KEY]?: SocketMetricsStore })
  | null {
  if (typeof window === "undefined") return null

  return window as Window & { [SOCKET_METRICS_KEY]?: SocketMetricsStore }
}

function getStore(): SocketMetricsStore {
  const metricsWindow = getMetricsWindow()
  if (!metricsWindow) {
    return createStore()
  }

  if (!metricsWindow[SOCKET_METRICS_KEY]) {
    metricsWindow[SOCKET_METRICS_KEY] = createStore()
  }

  return metricsWindow[SOCKET_METRICS_KEY]
}

function touch(store: SocketMetricsStore) {
  store.updatedAt = new Date().toISOString()
}

function incrementCounter(map: CounterMap, key: string, delta = 1) {
  map[key] = (map[key] ?? 0) + delta
}

function updatePeak(map: CounterMap, key: string, value: number) {
  map[key] = Math.max(map[key] ?? 0, value)
}

function percentile(samples: number[], ratio: number): number | null {
  if (samples.length === 0) return null

  const sorted = [...samples].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)

  return sorted[index]
}

function average(samples: number[]): number | null {
  if (samples.length === 0) return null
  return samples.reduce((sum, sample) => sum + sample, 0) / samples.length
}

export function resetSocketMetrics(): SocketMetricsSnapshot {
  const metricsWindow = getMetricsWindow()
  if (metricsWindow) {
    metricsWindow[SOCKET_METRICS_KEY] = createStore()
  }

  return getSocketMetricsSnapshot()
}

export function getSocketMetricsSnapshot(): SocketMetricsSnapshot {
  const store = getStore()

  return {
    ...store,
    activeRooms: { ...store.activeRooms },
    peakRooms: { ...store.peakRooms },
    activeHandlers: { ...store.activeHandlers },
    peakHandlers: { ...store.peakHandlers },
    handlerInvocations: { ...store.handlerInvocations },
    reconnectSamplesMs: [...store.reconnectSamplesMs],
    roomBalance: store.roomJoins - store.roomLeaves,
    reconnectCount: store.reconnectSamplesMs.length,
    reconnectAvgMs: average(store.reconnectSamplesMs),
    reconnectP95Ms: percentile(store.reconnectSamplesMs, 0.95),
    reconnectMaxMs:
      store.reconnectSamplesMs.length > 0 ? Math.max(...store.reconnectSamplesMs) : null,
  }
}

export function recordSocketConnectCall() {
  const store = getStore()
  store.connectCalls += 1
  touch(store)
}

export function recordSocketCreate() {
  const store = getStore()
  store.socketCreates += 1
  touch(store)
}

export function recordSocketConnected() {
  const store = getStore()
  store.connects += 1
  store.activeConnections = 1
  store.peakConnections = Math.max(store.peakConnections, store.activeConnections)

  if (store.lastDisconnectAt != null) {
    store.reconnectSamplesMs.push(performance.now() - store.lastDisconnectAt)
    store.lastDisconnectAt = null
  }

  touch(store)
}

export function recordSocketDisconnected() {
  const store = getStore()
  store.disconnects += 1
  store.activeConnections = 0
  store.lastDisconnectAt = performance.now()
  touch(store)
}

export function recordSocketConnectError(message: string) {
  const store = getStore()
  store.connectErrors += 1
  store.lastErrorMessage = message
  touch(store)
}

export function recordRoomJoin(prId: string) {
  const store = getStore()
  store.roomJoins += 1
  store.currentRoomSubscriptions += 1
  store.peakRoomSubscriptions = Math.max(
    store.peakRoomSubscriptions,
    store.currentRoomSubscriptions
  )
  incrementCounter(store.activeRooms, prId)
  updatePeak(store.peakRooms, prId, store.activeRooms[prId])
  touch(store)
}

export function recordRoomLeave(prId: string) {
  const store = getStore()
  store.roomLeaves += 1
  store.currentRoomSubscriptions = Math.max(0, store.currentRoomSubscriptions - 1)
  store.activeRooms[prId] = Math.max(0, (store.activeRooms[prId] ?? 0) - 1)
  touch(store)
}

export function recordHandlerRegistered(event: SocketMetricEvent) {
  const store = getStore()
  incrementCounter(store.activeHandlers, event)
  updatePeak(store.peakHandlers, event, store.activeHandlers[event])
  touch(store)
}

export function recordHandlerRemoved(event: SocketMetricEvent) {
  const store = getStore()
  store.activeHandlers[event] = Math.max(0, (store.activeHandlers[event] ?? 0) - 1)
  touch(store)
}

export function recordHandlerInvocation(event: SocketMetricEvent) {
  const store = getStore()
  incrementCounter(store.handlerInvocations, event)
  touch(store)
}
