"use client"

import Link from "next/link"

import {
  MetricCard,
  gridGapClass,
  panelClass,
  panelPaddingClass,
} from "@/components/measurements/MeasurementPrimitives"
import { useSocketMeasurement } from "@/hooks/useSocketMeasurement"

function formatMetricValue(value: number | null) {
  if (value == null) return "-"
  return `${value.toFixed(2)}ms`
}

export default function SocketMeasurementClient() {
  const { snapshot, eventRows, roomRows, summaryReport, refresh, reset } =
    useSocketMeasurement()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header className={`${panelClass} ${panelPaddingClass}`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-600">
              Measurement
            </p>
            <h1 className="mt-3 text-2xl font-bold text-slate-950 dark:text-slate-50">
              WebSocket 연결 구조 측정
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              같은 탭에서 카운터를 초기화한 뒤 PR 상세, 알림, 타이핑 흐름을 반복 탐색하고
              연결 수, room join/leave, 이벤트 handler 등록 상태를 확인하는 개발용 페이지입니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/measurements/comments"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              댓글 측정 페이지
            </Link>
            <button
              type="button"
              onClick={refresh}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              새로고침
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800"
            >
              카운터 초기화
            </button>
          </div>
        </div>
      </header>

      <section className={`grid md:grid-cols-3 ${gridGapClass}`}>
        <div className={`${panelClass} ${panelPaddingClass}`}>
          <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">
            측정 순서
          </h2>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
            <li>1. 같은 탭에서 카운터를 초기화합니다.</li>
            <li>2. PR 상세 페이지 진입, 이탈, 알림 패널 열기, 타이핑 입력을 반복합니다.</li>
            <li>3. 다시 이 페이지로 돌아와 연결 수와 handler 수가 안정적으로 유지되는지 확인합니다.</li>
          </ol>
        </div>

        <div className={`${panelClass} ${panelPaddingClass}`}>
          <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">
            추천 시나리오
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
            <li>PR 상세 진입/이탈 20회 반복</li>
            <li>알림 패널 열기/닫기와 PR 상세 이동 반복</li>
            <li>소켓 연결 후 서버 재시작 또는 네트워크 offline 후 복구</li>
          </ul>
        </div>

        <div className={`${panelClass} ${panelPaddingClass}`}>
          <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">
            기대 기준
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
            <li>`socketCreates`가 1에 머무르는지</li>
            <li>`roomJoins - roomLeaves`가 탐색 종료 후 0으로 돌아오는지</li>
            <li>이벤트별 `active handlers`가 반복 후 계속 증가하지 않는지</li>
          </ul>
        </div>
      </section>

      <section className={`grid md:grid-cols-2 lg:grid-cols-4 ${gridGapClass}`}>
        <MetricCard label="Socket 생성 수" value={snapshot.socketCreates} />
        <MetricCard label="connect() 호출 수" value={snapshot.connectCalls} />
        <MetricCard label="최대 활성 연결 수" value={snapshot.peakConnections} />
        <MetricCard
          label="재연결 P95"
          value={formatMetricValue(snapshot.reconnectP95Ms)}
        />
      </section>

      <section className={`grid md:grid-cols-2 lg:grid-cols-4 ${gridGapClass}`}>
        <MetricCard label="room join" value={snapshot.roomJoins} />
        <MetricCard label="room leave" value={snapshot.roomLeaves} />
        <MetricCard label="room balance" value={snapshot.roomBalance} />
        <MetricCard
          label="최대 동시 room 구독 수"
          value={snapshot.peakRoomSubscriptions}
        />
      </section>

      <section className={`grid lg:grid-cols-[1.2fr_0.8fr] ${gridGapClass}`}>
        <div className={`${panelClass} ${panelPaddingClass}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">
                이벤트 handler 상태
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                반복 탐색 후 active 값이 계속 증가하면 cleanup 누수 가능성이 있습니다.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              auto refresh 1s
            </span>
          </div>

          <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">이벤트</th>
                  <th className="px-3 py-2 font-semibold">Active</th>
                  <th className="px-3 py-2 font-semibold">Peak</th>
                  <th className="px-3 py-2 font-semibold">Invocations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {eventRows.map((row) => (
                  <tr key={row.event}>
                    <td className="px-3 py-2 font-mono text-xs">{row.event}</td>
                    <td className="px-3 py-2 font-semibold">{row.active}</td>
                    <td className="px-3 py-2">{row.peak}</td>
                    <td className="px-3 py-2">{row.invocations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={`${panelClass} ${panelPaddingClass}`}>
          <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">
            room 구독 상태
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            PR 상세를 여러 번 드나든 뒤 active 구독 수가 0 또는 기대값으로 돌아오는지 봅니다.
          </p>

          <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Room</th>
                  <th className="px-3 py-2 font-semibold">Active</th>
                  <th className="px-3 py-2 font-semibold">Peak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {roomRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-slate-500" colSpan={3}>
                      아직 기록된 room 구독이 없습니다.
                    </td>
                  </tr>
                ) : (
                  roomRows.map((row) => (
                    <tr key={row.roomId}>
                      <td className="px-3 py-2 font-mono text-xs">{row.roomId}</td>
                      <td className="px-3 py-2 font-semibold">{row.active}</td>
                      <td className="px-3 py-2">{row.peak}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={`${panelClass} ${panelPaddingClass}`}>
        <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">
          요약 문장
        </h2>
        <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-sm leading-6 text-slate-100">
          {summaryReport}
        </pre>
      </section>
    </div>
  )
}
