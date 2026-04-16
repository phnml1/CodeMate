"use client"

import Link from "next/link"
import { useState } from "react"
import { useSearchParams } from "next/navigation"

import {
  MetricCard,
  gridGapClass,
  panelClass,
  panelPaddingClass,
} from "@/components/measurements/MeasurementPrimitives"
import {
  DEFAULT_DELAY_MS,
  DEFAULT_ITERATIONS,
} from "@/lib/measurements/commentMeasurement"
import { useCommentCacheMeasurement } from "@/hooks/useCommentCacheMeasurement"
import { useCommentLatencyMeasurement } from "@/hooks/useCommentLatencyMeasurement"

export default function CommentLatencyMeasurementClient() {
  const searchParams = useSearchParams()
  const initialPrId = searchParams.get("prId") ?? ""
  const [prId, setPrId] = useState(initialPrId)
  const [iterations, setIterations] = useState(DEFAULT_ITERATIONS)
  const [delayMs, setDelayMs] = useState(DEFAULT_DELAY_MS)

  const { commentsQuery, isRunning } = useCommentCacheMeasurement(prId, iterations, delayMs, false)
  const { isLatencyRunning, latestLatency, latencyReport, runLatencyMeasurement } =
    useCommentLatencyMeasurement(
      prId,
      iterations,
      delayMs,
      commentsQuery.data,
      isRunning || commentsQuery.isLoading
    )

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header className={`${panelClass} ${panelPaddingClass}`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-600">
              Measurement
            </p>
            <h1 className="mt-3 text-2xl font-bold text-slate-950 dark:text-slate-50">
              댓글 이벤트 반영 latency 측정
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              이 페이지는 synthetic event가 들어온 뒤 React Query 데이터 반영이 관측될 때까지의
              latency만 측정합니다. 캐시 동기화 전략 비교와 질문이 다르기 때문에 별도 페이지로 분리했습니다.
            </p>
          </div>
          <Link
            href={`/measurements/comments${prId ? `?prId=${prId}` : ""}`}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            캐시 동기화 측정으로 돌아가기
          </Link>
        </div>
      </header>

      <section className={`grid md:grid-cols-3 ${gridGapClass} ${panelClass} ${panelPaddingClass}`}>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          PR ID
          <input
            value={prId}
            onChange={(event) => setPrId(event.target.value.trim())}
            placeholder="cm..."
            className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          반복 횟수
          <input
            type="number"
            min={1}
            max={100}
            value={iterations}
            onChange={(event) => setIterations(Number(event.target.value))}
            className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          이벤트 간격(ms)
          <input
            type="number"
            min={0}
            max={5000}
            value={delayMs}
            onChange={(event) => setDelayMs(Number(event.target.value))}
            className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
      </section>

      {commentsQuery.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          댓글을 불러오지 못했습니다. 현재 계정에서 접근 가능한 PR ID인지 확인해 주세요.
        </div>
      ) : null}

      <section className={`${panelClass} ${panelPaddingClass}`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">
              Event latency
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              synthetic event를 `setQueryData`로 캐시에 기록한 뒤, 구독 중인 댓글 query에서
              데이터 반영이 관측될 때까지 시간을 측정합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={runLatencyMeasurement}
            disabled={!prId || isRunning || isLatencyRunning || commentsQuery.isLoading}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-700/20 hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLatencyRunning ? "측정 중..." : "latency 측정 실행"}
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <MetricCard label="평균" value={latestLatency ? `${latestLatency.avgMs}ms` : "-"} />
          <MetricCard label="P95" value={latestLatency ? `${latestLatency.p95Ms}ms` : "-"} />
          <MetricCard label="최소" value={latestLatency ? `${latestLatency.minMs}ms` : "-"} />
          <MetricCard label="최대" value={latestLatency ? `${latestLatency.maxMs}ms` : "-"} />
        </div>

        <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-sm leading-6 text-slate-100">
          {latencyReport}
        </pre>
      </section>
    </div>
  )
}
