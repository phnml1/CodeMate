"use client"

import Link from "next/link"
import { Profiler, memo, useState } from "react"
import { useSearchParams } from "next/navigation"

import {
  DarkMetric,
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

const MeasuredCommentListProbe = memo(function MeasuredCommentListProbe({
  commentCount,
  isFetching,
  latestIds,
}: {
  commentCount: number
  isFetching: boolean
  latestIds: string
}) {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      <MetricCard label="현재 댓글 수" value={commentCount} />
      <MetricCard label="조회 상태" value={isFetching ? "fetching" : "idle"} />
      <MetricCard label="최근 댓글 ID" value={latestIds || "-"} />
    </div>
  )
})

export default function CommentCacheMeasurementClient() {
  const searchParams = useSearchParams()
  const initialPrId = searchParams.get("prId") ?? ""
  const [prId, setPrId] = useState(initialPrId)
  const [iterations, setIterations] = useState(DEFAULT_ITERATIONS)
  const [delayMs, setDelayMs] = useState(DEFAULT_DELAY_MS)

  const {
    commentsQuery,
    handleCommentListRender,
    isRunning,
    results,
    runMeasurement,
    requestDiff,
    requestReductionRate,
    renderDiff,
    renderReductionRate,
    summaryReport,
  } = useCommentCacheMeasurement(prId, iterations, delayMs, false)

  const latestIds =
    commentsQuery.data
      ?.slice(-3)
      .map((comment) => comment.id.slice(-6))
      .join(", ") ?? ""

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header className={`${panelClass} ${panelPaddingClass}`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-600">
              Measurement
            </p>
            <h1 className="mt-3 text-2xl font-bold text-slate-950 dark:text-slate-50">
              댓글 캐시 동기화 측정
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              이 페이지는 `setQueryData`와 `invalidate/refetch`의 캐시 동기화 전략만
              비교합니다. API 요청 수, render commit 수, commit duration 합계를 같은
              조건에서 확인할 수 있습니다.
            </p>
          </div>
          <Link
            href={`/measurements/comments/latency${prId ? `?prId=${prId}` : ""}`}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            latency 측정 페이지
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
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">
              Render probe
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              React Profiler를 댓글 리스트 probe 서브트리에만 연결해 주변 UI 변화 잡음을 줄였습니다.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            {commentsQuery.isFetching ? "fetching" : "idle"}
          </span>
        </div>

        <Profiler id="comment-list-probe" onRender={handleCommentListRender}>
          <MeasuredCommentListProbe
            commentCount={commentsQuery.data?.length ?? 0}
            isFetching={commentsQuery.isFetching}
            latestIds={latestIds}
          />
        </Profiler>
      </section>

      <section className={`grid md:grid-cols-2 ${gridGapClass}`}>
        <button
          type="button"
          onClick={() => runMeasurement("setQueryData")}
          disabled={!prId || isRunning || commentsQuery.isLoading}
          className="rounded-md border border-blue-200 bg-blue-50 p-4 text-left transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 sm:p-5"
        >
          <span className="text-sm font-semibold text-blue-700">전략 A</span>
          <span className="mt-2 block text-lg font-bold text-slate-950">
            setQueryData 직접 갱신
          </span>
          <span className="mt-2 block text-sm leading-6 text-slate-600">
            synthetic comment를 캐시에 직접 추가합니다. refetch 없이 즉시 반영되는 흐름을 측정합니다.
          </span>
        </button>

        <button
          type="button"
          onClick={() => runMeasurement("invalidate")}
          disabled={!prId || isRunning || commentsQuery.isLoading}
          className="rounded-md border border-slate-200 bg-white p-4 text-left transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:p-5"
        >
          <span className="text-sm font-semibold text-slate-600">전략 B</span>
          <span className="mt-2 block text-lg font-bold text-slate-950">
            invalidate 후 refetch
          </span>
          <span className="mt-2 block text-sm leading-6 text-slate-600">
            활성 댓글 query를 invalidate해서 네트워크 재요청 기반 갱신 흐름을 측정합니다.
          </span>
        </button>
      </section>

      <section className={`grid lg:grid-cols-[1fr_360px] ${gridGapClass}`}>
        <div className={`${panelClass} ${panelPaddingClass}`}>
          <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">측정 결과</h2>
          <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">전략</th>
                  <th className="px-3 py-2 font-semibold">반복</th>
                  <th className="px-3 py-2 font-semibold">요청 수</th>
                  <th className="px-3 py-2 font-semibold">캐시 write</th>
                  <th className="px-3 py-2 font-semibold">Render commits</th>
                  <th className="px-3 py-2 font-semibold">Fetching commits</th>
                  <th className="px-3 py-2 font-semibold">Commit duration</th>
                  <th className="px-3 py-2 font-semibold">총 소요 시간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {results.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-slate-500" colSpan={8}>
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
                      <td className="px-3 py-2 font-semibold">{result.renderCommitCount}</td>
                      <td className="px-3 py-2">{result.fetchingCommitCount}</td>
                      <td className="px-3 py-2">{result.totalActualDurationMs}ms</td>
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
            <DarkMetric
              label="요청 감소량"
              value={requestDiff == null ? "-" : `${requestDiff}`}
            />
            <DarkMetric
              label="요청 감소율"
              value={requestReductionRate == null ? "-" : `${requestReductionRate}%`}
            />
            <DarkMetric
              label="Render commit 감소"
              value={renderDiff == null ? "-" : `${renderDiff}`}
            />
            <DarkMetric
              label="Render 감소율"
              value={renderReductionRate == null ? "-" : `${renderReductionRate}%`}
            />
          </div>
        </aside>
      </section>

      <section className={`${panelClass} ${panelPaddingClass}`}>
        <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">
          이력서/포트폴리오 기록용 문장
        </h2>
        <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-sm leading-6 text-slate-100">
          {summaryReport}
        </pre>
      </section>
    </div>
  )
}
