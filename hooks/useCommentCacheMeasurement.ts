"use client"

import { useMemo, useRef, useState, type ProfilerOnRenderCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import {
  resetRenderCounts,
  setRenderMeasurementEnabled,
} from "@/lib/measurements/renderCounter"
import type { CommentWithAuthor } from "@/types/comment"
import {
  type RunResult,
  type Strategy,
  fetchComments,
  makeSyntheticComment,
  sleep,
} from "@/lib/measurements/commentMeasurement"

export function useCommentCacheMeasurement(
  prId: string,
  iterations: number,
  delayMs: number,
  disabled: boolean
) {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<RunResult[]>([])
  const requestCountRef = useRef(0)
  const cacheWriteCountRef = useRef(0)
  const renderCommitCountRef = useRef(0)
  const fetchingCommitCountRef = useRef(0)
  const totalActualDurationRef = useRef(0)
  const measurementActiveRef = useRef(false)
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

  const resetCounters = () => {
    requestCountRef.current = 0
    cacheWriteCountRef.current = 0
    renderCommitCountRef.current = 0
    fetchingCommitCountRef.current = 0
    totalActualDurationRef.current = 0
  }

  const handleCommentListRender: ProfilerOnRenderCallback = (_, __, actualDuration) => {
    if (!measurementActiveRef.current) return

    renderCommitCountRef.current += 1
    totalActualDurationRef.current += actualDuration

    if (commentsQuery.isFetching) {
      fetchingCommitCountRef.current += 1
    }
  }

  const runMeasurement = async (strategy: Strategy) => {
    if (!prId || isRunning || disabled) return

    setIsRunning(true)
    resetCounters()
    resetRenderCounts()
    setRenderMeasurementEnabled(false)
    measurementActiveRef.current = true

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
          renderCommitCount: renderCommitCountRef.current,
          fetchingCommitCount: fetchingCommitCountRef.current,
          totalActualDurationMs: Number(totalActualDurationRef.current.toFixed(2)),
          startedAt: startedAt.toISOString(),
          finishedAt: finishedAt.toISOString(),
          durationMs: Math.round(performance.now() - start),
        },
        ...prev,
      ])
    } finally {
      measurementActiveRef.current = false
      setRenderMeasurementEnabled(false)
      setIsRunning(false)
    }
  }

  const latestSetQueryData = results.find((result) => result.strategy === "setQueryData")
  const latestInvalidate = results.find((result) => result.strategy === "invalidate")
  const requestDiff =
    latestSetQueryData && latestInvalidate
      ? latestInvalidate.requestCount - latestSetQueryData.requestCount
      : null
  const requestReductionRate =
    requestDiff != null && latestInvalidate && latestInvalidate.requestCount > 0
      ? Math.round((requestDiff / latestInvalidate.requestCount) * 100)
      : null
  const renderDiff =
    latestSetQueryData && latestInvalidate
      ? latestInvalidate.renderCommitCount - latestSetQueryData.renderCommitCount
      : null
  const renderReductionRate =
    renderDiff != null && latestInvalidate && latestInvalidate.renderCommitCount > 0
      ? Math.round((renderDiff / latestInvalidate.renderCommitCount) * 100)
      : null

  const summaryReport = useMemo(() => {
    if (!latestSetQueryData || !latestInvalidate) {
      return "두 전략을 모두 실행하면 비교 요약 문장이 여기에 표시됩니다."
    }

    return [
      `시나리오: 댓글 동기화 이벤트 ${Math.min(
        latestSetQueryData.iterations,
        latestInvalidate.iterations
      )}회`,
      "",
      `- invalidate/refetch 요청 수: ${latestInvalidate.requestCount}회`,
      `- setQueryData 요청 수: ${latestSetQueryData.requestCount}회`,
      `- 요청 감소량: ${requestDiff ?? 0}회 (${requestReductionRate ?? 0}%)`,
      `- invalidate/refetch render commit: ${latestInvalidate.renderCommitCount}회`,
      `- setQueryData render commit: ${latestSetQueryData.renderCommitCount}회`,
      `- render commit 감소: ${renderDiff ?? 0}회 (${renderReductionRate ?? 0}%)`,
      `- invalidate/refetch commit duration 합계: ${latestInvalidate.totalActualDurationMs}ms`,
      `- setQueryData commit duration 합계: ${latestSetQueryData.totalActualDurationMs}ms`,
      `- 측정 페이지: /measurements/comments?prId=${prId}`,
      `- 측정 날짜: ${new Date().toISOString().slice(0, 10)}`,
    ].join("\n")
  }, [
    latestInvalidate,
    latestSetQueryData,
    prId,
    renderDiff,
    renderReductionRate,
    requestDiff,
    requestReductionRate,
  ])

  const documentDraft = useMemo(() => {
    if (!latestSetQueryData || !latestInvalidate) {
      return [
        "### 3. 캐시 동기화로 인한 렌더링 횟수 변화",
        "",
        "- 두 전략을 모두 실행하면 이 영역에 문서 초안이 자동으로 생성됩니다.",
        `- 측정 페이지: /measurements/comments${prId ? `?prId=${prId}` : ""}`,
        prId ? `- 2차 보강 페이지: /pulls/${prId}?measureRenders=1` : "- 2차 보강 페이지: PR ID 입력 후 활성화",
      ].join("\n")
    }

    return [
      "### 3. 캐시 동기화로 인한 렌더링 횟수 변화",
      "",
      "#### 1차 측정 개요",
      `- 시나리오: 동일 PR(${prId})에서 댓글 동기화 이벤트 ${Math.min(
        latestSetQueryData.iterations,
        latestInvalidate.iterations
      )}회 반복`,
      `- 측정 페이지: /measurements/comments?prId=${prId}`,
      `- 측정 일자: ${new Date().toISOString().slice(0, 10)}`,
      "",
      "#### 1차 측정 결과",
      `- invalidate/refetch 요청 수: ${latestInvalidate.requestCount}회`,
      `- setQueryData 요청 수: ${latestSetQueryData.requestCount}회`,
      `- 요청 감소량: ${requestDiff ?? 0}회 (${requestReductionRate ?? 0}%)`,
      `- invalidate/refetch render commit: ${latestInvalidate.renderCommitCount}회`,
      `- setQueryData render commit: ${latestSetQueryData.renderCommitCount}회`,
      `- render commit 감소량: ${renderDiff ?? 0}회 (${renderReductionRate ?? 0}%)`,
      `- invalidate/refetch commit duration 합계: ${latestInvalidate.totalActualDurationMs}ms`,
      `- setQueryData commit duration 합계: ${latestSetQueryData.totalActualDurationMs}ms`,
      "",
      "#### 2차 보강 계획",
      `- 실제 댓글 UI 렌더 카운터 확인 경로: /pulls/${prId}?measureRenders=1`,
      "- 측정 대상: CommentList, CommentItem",
      "- 보강 방식: 실제 PR 상세 화면에서 렌더 카운터 패널 캡처 후 본 문단에 보강",
    ].join("\n")
  }, [
    latestInvalidate,
    latestSetQueryData,
    prId,
    renderDiff,
    renderReductionRate,
    requestDiff,
    requestReductionRate,
  ])

  return {
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
    documentDraft,
  }
}
