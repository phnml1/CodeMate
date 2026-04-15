"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"
import type { CommentWithAuthor } from "@/types/comment"

type Strategy = "setQueryData" | "invalidate"

type RunResult = {
  strategy: Strategy
  iterations: number
  requestCount: number
  cacheWriteCount: number
  startedAt: string
  finishedAt: string
  durationMs: number
}

type LatencyResult = {
  id: string
  iterations: number
  minMs: number
  maxMs: number
  avgMs: number
  p95Ms: number
  samples: number[]
  startedAt: string
  finishedAt: string
}

type PendingLatencyEvent = {
  sentAt: number
  index: number
}

const DEFAULT_ITERATIONS = 10
const DEFAULT_DELAY_MS = 120
const LATENCY_TIMEOUT_MS = 5000
const panelClass =
  "rounded-md border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
const panelPaddingClass = "p-4 sm:p-6 md:p-8"
const gridGapClass = "gap-4 sm:gap-6"

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function makeSyntheticComment(
  prId: string,
  index: number,
  label: string
): CommentWithAuthor {
  const now = new Date().toISOString()

  return {
    id: `measurement-${label}-${Date.now()}-${index}`,
    content: `[measurement] ${label} event ${index + 1}`,
    lineNumber: null,
    filePath: null,
    isResolved: false,
    pullRequestId: prId,
    authorId: "measurement-user",
    parentId: null,
    mentions: [],
    reactions: {},
    createdAt: now,
    updatedAt: now,
    author: {
      id: "measurement-user",
      name: "Measurement",
      image: null,
    },
    replies: [],
  }
}

async function fetchComments(prId: string, onRequest: () => void) {
  onRequest()

  const res = await fetch(`/api/pulls/${prId}/comments`, {
    cache: "no-store",
  })
  if (!res.ok) throw new Error("댓글을 불러오지 못했습니다.")

  const data = await res.json()
  return data.comments as CommentWithAuthor[]
}

function percentile(values: number[], p: number) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[index]
}

function summarizeLatency(samples: number[]) {
  if (samples.length === 0) {
    return { minMs: 0, maxMs: 0, avgMs: 0, p95Ms: 0 }
  }

  const rounded = samples.map((value) => Number(value.toFixed(2)))
  const sum = rounded.reduce((acc, value) => acc + value, 0)

  return {
    minMs: Math.min(...rounded),
    maxMs: Math.max(...rounded),
    avgMs: Number((sum / rounded.length).toFixed(2)),
    p95Ms: Number(percentile(rounded, 95).toFixed(2)),
  }
}

export default function CommentCacheMeasurementClient() {
  const searchParams = useSearchParams()
  const initialPrId = searchParams.get("prId") ?? ""
  const [prId, setPrId] = useState(initialPrId)
  const [iterations, setIterations] = useState(DEFAULT_ITERATIONS)
  const [delayMs, setDelayMs] = useState(DEFAULT_DELAY_MS)
  const [isRunning, setIsRunning] = useState(false)
  const [isLatencyRunning, setIsLatencyRunning] = useState(false)
  const [results, setResults] = useState<RunResult[]>([])
  const [latencyResults, setLatencyResults] = useState<LatencyResult[]>([])
  const requestCountRef = useRef(0)
  const cacheWriteCountRef = useRef(0)
  const pendingLatencyRef = useRef<Map<string, PendingLatencyEvent>>(new Map())
  const latencySamplesRef = useRef<number[]>([])
  const latencyResolveRef = useRef<(() => void) | null>(null)
  const latencyExpectedCountRef = useRef(0)
  const queryClient = useQueryClient()

  const queryKey = useMemo(() => ["comments", prId] as const, [prId])

  const commentsQuery = useQuery({
    queryKey,
    queryFn: () =>
      fetchComments(prId, () => {
        requestCountRef.current += 1
      }),
    enabled: prId.length > 0,
    staleTime: 0,
    gcTime: 0,
  })

  useEffect(() => {
    if (!commentsQuery.data || pendingLatencyRef.current.size === 0) return

    for (const comment of commentsQuery.data) {
      const pending = pendingLatencyRef.current.get(comment.id)
      if (!pending) continue

      const observedAt = performance.now()
      latencySamplesRef.current[pending.index] = observedAt - pending.sentAt
      pendingLatencyRef.current.delete(comment.id)
    }

    if (
      latencySamplesRef.current.filter((sample) => sample != null).length >=
        latencyExpectedCountRef.current &&
      latencyResolveRef.current
    ) {
      latencyResolveRef.current()
      latencyResolveRef.current = null
    }
  }, [commentsQuery.data])

  const resetCounters = () => {
    requestCountRef.current = 0
    cacheWriteCountRef.current = 0
  }

  const runMeasurement = async (strategy: Strategy) => {
    if (!prId || isRunning || isLatencyRunning) return

    setIsRunning(true)
    resetCounters()

    const startedAt = new Date()
    const start = performance.now()

    try {
      for (let i = 0; i < iterations; i += 1) {
        if (strategy === "setQueryData") {
          const nextComment = makeSyntheticComment(prId, i, strategy)

          queryClient.setQueryData<CommentWithAuthor[]>(queryKey, (old) => {
            cacheWriteCountRef.current += 1
            return old ? [...old, nextComment] : [nextComment]
          })
        } else {
          await queryClient.invalidateQueries({
            queryKey,
            refetchType: "active",
          })
        }

        if (delayMs > 0) {
          await sleep(delayMs)
        }
      }

      const finishedAt = new Date()
      setResults((prev) => [
        {
          strategy,
          iterations,
          requestCount: requestCountRef.current,
          cacheWriteCount: cacheWriteCountRef.current,
          startedAt: startedAt.toISOString(),
          finishedAt: finishedAt.toISOString(),
          durationMs: Math.round(performance.now() - start),
        },
        ...prev,
      ])
    } finally {
      setIsRunning(false)
    }
  }

  const waitForLatencySamples = () =>
    new Promise<void>((resolve) => {
      const timeoutId = window.setTimeout(() => {
        latencyResolveRef.current = null
        resolve()
      }, LATENCY_TIMEOUT_MS)

      latencyResolveRef.current = () => {
        window.clearTimeout(timeoutId)
        resolve()
      }
    })

  const runLatencyMeasurement = async () => {
    if (!prId || isRunning || isLatencyRunning) return

    setIsLatencyRunning(true)
    pendingLatencyRef.current.clear()
    latencySamplesRef.current = []
    latencyExpectedCountRef.current = iterations

    const runId = `latency-${Date.now()}`
    const startedAt = new Date()
    const waiter = waitForLatencySamples()

    try {
      for (let i = 0; i < iterations; i += 1) {
        const nextComment = makeSyntheticComment(prId, i, `${runId}-${i}`)

        pendingLatencyRef.current.set(nextComment.id, {
          sentAt: performance.now(),
          index: i,
        })

        queryClient.setQueryData<CommentWithAuthor[]>(queryKey, (old) =>
          old ? [...old, nextComment] : [nextComment]
        )

        if (delayMs > 0) {
          await sleep(delayMs)
        }
      }

      await waiter

      const samples = latencySamplesRef.current.filter((sample) => sample != null)
      const summary = summarizeLatency(samples)
      const finishedAt = new Date()

      setLatencyResults((prev) => [
        {
          id: runId,
          iterations,
          samples,
          startedAt: startedAt.toISOString(),
          finishedAt: finishedAt.toISOString(),
          ...summary,
        },
        ...prev,
      ])
    } finally {
      pendingLatencyRef.current.clear()
      latencyResolveRef.current = null
      setIsLatencyRunning(false)
    }
  }

  const latestSetQueryData = results.find((result) => result.strategy === "setQueryData")
  const latestInvalidate = results.find((result) => result.strategy === "invalidate")
  const latestLatency = latencyResults[0]
  const diff =
    latestSetQueryData && latestInvalidate
      ? latestInvalidate.requestCount - latestSetQueryData.requestCount
      : null
  const reductionRate =
    diff != null && latestInvalidate && latestInvalidate.requestCount > 0
      ? Math.round((diff / latestInvalidate.requestCount) * 100)
      : null

  const networkReport = useMemo(() => {
    if (!latestSetQueryData || !latestInvalidate) {
      return "두 전략을 모두 실행하면 비교 결과가 여기에 표시됩니다."
    }

    return [
      `시나리오: PR 상세 댓글 이벤트 ${Math.min(
        latestSetQueryData.iterations,
        latestInvalidate.iterations
      )}회 수신`,
      "",
      `- invalidate/refetch 기반 처리: API 요청 ${latestInvalidate.requestCount}회`,
      `- setQueryData 기반 처리: API 요청 ${latestSetQueryData.requestCount}회`,
      `- 요청 감소량: ${diff ?? 0}회`,
      `- 요청 감소율: ${reductionRate ?? 0}%`,
      `- 측정 환경: local browser measurement page`,
      `- 측정 페이지: /measurements/comments?prId=${prId}`,
      `- 측정 날짜: ${new Date().toISOString().slice(0, 10)}`,
    ].join("\n")
  }, [diff, latestInvalidate, latestSetQueryData, prId, reductionRate])

  const latencyReport = useMemo(() => {
    if (!latestLatency) {
      return "latency 측정을 실행하면 결과 문장이 여기에 표시됩니다."
    }

    return [
      `시나리오: synthetic socket 댓글 이벤트 ${latestLatency.iterations}회 수신`,
      "",
      `- 측정 구간: 이벤트 수신 시점 → setQueryData 캐시 갱신 → React Query 데이터 반영 관측`,
      `- 평균 반영 latency: ${latestLatency.avgMs}ms`,
      `- p95 반영 latency: ${latestLatency.p95Ms}ms`,
      `- 최소/최대: ${latestLatency.minMs}ms / ${latestLatency.maxMs}ms`,
      `- 측정 환경: local browser measurement page`,
      `- 측정 페이지: /measurements/comments?prId=${prId}`,
      `- 측정 날짜: ${new Date().toISOString().slice(0, 10)}`,
    ].join("\n")
  }, [latestLatency, prId])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header className={cn(panelClass, panelPaddingClass)}>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-600">
          Measurement
        </p>
        <h1 className="mt-3 text-2xl font-bold text-slate-950 dark:text-slate-50">
          댓글 캐시 갱신 및 실시간 반영 latency 측정
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          같은 댓글 query를 대상으로 socket 이벤트 수신 상황을 재현합니다.
          <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-900">
            setQueryData
          </code>
          방식의 네트워크 요청 감소량과 이벤트 수신 후 화면 데이터에 반영되기까지의 latency를 측정합니다.
        </p>
      </header>

      <section
        className={cn(
          "grid md:grid-cols-3",
          gridGapClass,
          panelClass,
          panelPaddingClass
        )}
      >
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          PR ID
          <input
            value={prId}
            onChange={(event) => setPrId(event.target.value.trim())}
            placeholder="예: cm..."
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

      <section className={`grid md:grid-cols-3 ${gridGapClass}`}>
        <MetricCard label="현재 댓글 수" value={commentsQuery.data?.length ?? 0} />
        <MetricCard label="초기 로드 상태" value={commentsQuery.isFetching ? "fetching" : "idle"} />
        <MetricCard label="최근 latency 평균" value={latestLatency ? `${latestLatency.avgMs}ms` : "-"} />
      </section>

      {commentsQuery.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          댓글을 불러오지 못했습니다. PR ID가 현재 로그인 사용자에게 접근 가능한 값인지 확인하세요.
        </div>
      ) : null}

      <section className={`grid md:grid-cols-2 ${gridGapClass}`}>
        <button
          type="button"
          onClick={() => runMeasurement("setQueryData")}
          disabled={!prId || isRunning || isLatencyRunning || commentsQuery.isLoading}
          className="rounded-md border border-blue-200 bg-blue-50 p-4 text-left transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 sm:p-5"
        >
          <span className="text-sm font-semibold text-blue-700">Run A</span>
          <span className="mt-2 block text-lg font-bold text-slate-950">
            setQueryData 직접 갱신
          </span>
          <span className="mt-2 block text-sm leading-6 text-slate-600">
            이벤트마다 Query 캐시에 synthetic comment를 추가합니다. 댓글 API 재요청이 없어야 정상입니다.
          </span>
        </button>

        <button
          type="button"
          onClick={() => runMeasurement("invalidate")}
          disabled={!prId || isRunning || isLatencyRunning || commentsQuery.isLoading}
          className="rounded-md border border-slate-200 bg-white p-4 text-left transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:p-5"
        >
          <span className="text-sm font-semibold text-slate-600">Run B</span>
          <span className="mt-2 block text-lg font-bold text-slate-950">
            invalidate/refetch 갱신
          </span>
          <span className="mt-2 block text-sm leading-6 text-slate-600">
            이벤트마다 활성 댓글 query를 invalidate해서 실제 댓글 API 요청 수를 측정합니다.
          </span>
        </button>
      </section>

      <section className={cn(panelClass, panelPaddingClass)}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">
              실시간 이벤트 반영 latency
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              synthetic socket 이벤트 수신 시점부터 React Query 데이터 반영이 관측되는 시점까지 측정합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={runLatencyMeasurement}
            disabled={!prId || isRunning || isLatencyRunning || commentsQuery.isLoading}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-700/20 hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLatencyRunning ? "측정 중..." : "Latency 측정 실행"}
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <MetricCard label="평균" value={latestLatency ? `${latestLatency.avgMs}ms` : "-"} />
          <MetricCard label="p95" value={latestLatency ? `${latestLatency.p95Ms}ms` : "-"} />
          <MetricCard label="최소" value={latestLatency ? `${latestLatency.minMs}ms` : "-"} />
          <MetricCard label="최대" value={latestLatency ? `${latestLatency.maxMs}ms` : "-"} />
        </div>

        <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-sm leading-6 text-slate-100">
          {latencyReport}
        </pre>
      </section>

      <section className={`grid lg:grid-cols-[1fr_360px] ${gridGapClass}`}>
        <div className={cn(panelClass, panelPaddingClass)}>
          <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">측정 결과</h2>
          <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">전략</th>
                  <th className="px-3 py-2 font-semibold">반복</th>
                  <th className="px-3 py-2 font-semibold">API 요청</th>
                  <th className="px-3 py-2 font-semibold">캐시 write</th>
                  <th className="px-3 py-2 font-semibold">소요 시간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {results.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-slate-500" colSpan={5}>
                      아직 측정 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  results.map((result) => (
                    <tr key={`${result.strategy}-${result.startedAt}`}>
                      <td className="px-3 py-2 font-mono text-xs">{result.strategy}</td>
                      <td className="px-3 py-2">{result.iterations}</td>
                      <td className="px-3 py-2 font-semibold">{result.requestCount}</td>
                      <td className="px-3 py-2">{result.cacheWriteCount}</td>
                      <td className="px-3 py-2">{result.durationMs}ms</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-md border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
          <h2 className="text-lg font-bold">비교 요약</h2>
          <div className="mt-4 grid gap-3">
            <DarkMetric label="요청 감소량" value={diff == null ? "-" : `${diff}회`} />
            <DarkMetric
              label="요청 감소율"
              value={reductionRate == null ? "-" : `${reductionRate}%`}
            />
          </div>
        </aside>
      </section>

      <section className={cn(panelClass, panelPaddingClass)}>
        <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">
          포트폴리오 기록용 문장
        </h2>
        <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-sm leading-6 text-slate-100">
          {networkReport}
        </pre>
      </section>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={cn(panelClass, "p-4 sm:p-5")}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-50">{value}</p>
    </div>
  )
}

function DarkMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/10 p-3">
      <p className="text-xs text-slate-300">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}
