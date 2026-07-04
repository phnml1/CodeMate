"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import {
  SOCKET_METRIC_EVENTS,
  getSocketMetricsSnapshot,
  resetSocketMetrics,
} from "@/lib/measurements/socketMetrics"

const REFRESH_INTERVAL_MS = 1000

function formatMetricValue(value: number | null) {
  if (value == null) return "-"
  return `${value.toFixed(2)}ms`
}

export function useSocketMeasurement() {
  const [snapshot, setSnapshot] = useState(() => getSocketMetricsSnapshot())

  const refresh = useCallback(() => {
    setSnapshot(getSocketMetricsSnapshot())
  }, [])

  const reset = useCallback(() => {
    setSnapshot(resetSocketMetrics())
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(refresh, REFRESH_INTERVAL_MS)
    return () => {
      window.clearInterval(intervalId)
    }
  }, [refresh])

  const eventRows = useMemo(
    () =>
      SOCKET_METRIC_EVENTS.map((event) => ({
        event,
        active: snapshot.activeHandlers[event] ?? 0,
        peak: snapshot.peakHandlers[event] ?? 0,
        invocations: snapshot.handlerInvocations[event] ?? 0,
      })),
    [snapshot.activeHandlers, snapshot.handlerInvocations, snapshot.peakHandlers]
  )

  const roomRows = useMemo(
    () =>
      Object.keys({ ...snapshot.activeRooms, ...snapshot.peakRooms })
        .sort()
        .map((roomId) => ({
          roomId,
          active: snapshot.activeRooms[roomId] ?? 0,
          peak: snapshot.peakRooms[roomId] ?? 0,
        })),
    [snapshot.activeRooms, snapshot.peakRooms]
  )

  const summaryReport = useMemo(
    () =>
      [
        "시나리오: 같은 탭에서 socket 계측 초기화 후 PR 상세/알림 화면을 반복 탐색",
        "",
        `- socket 생성 수: ${snapshot.socketCreates}`,
        `- connect() 호출 수: ${snapshot.connectCalls}`,
        `- 연결 성공 / 끊김 / 오류: ${snapshot.connects} / ${snapshot.disconnects} / ${snapshot.connectErrors}`,
        `- 최대 활성 연결 수: ${snapshot.peakConnections}`,
        `- room join / leave / balance: ${snapshot.roomJoins} / ${snapshot.roomLeaves} / ${snapshot.roomBalance}`,
        `- 최대 동시 room 구독 수: ${snapshot.peakRoomSubscriptions}`,
        `- 재연결 횟수: ${snapshot.reconnectCount}`,
        `- 재연결 평균 / p95 / 최대: ${formatMetricValue(snapshot.reconnectAvgMs)} / ${formatMetricValue(snapshot.reconnectP95Ms)} / ${formatMetricValue(snapshot.reconnectMaxMs)}`,
        `- 마지막 오류: ${snapshot.lastErrorMessage ?? "-"}`,
        `- 시작 시각: ${snapshot.startedAt}`,
        `- 마지막 갱신: ${snapshot.updatedAt}`,
      ].join("\n"),
    [snapshot]
  )

  return {
    snapshot,
    eventRows,
    roomRows,
    summaryReport,
    refresh,
    reset,
  }
}
