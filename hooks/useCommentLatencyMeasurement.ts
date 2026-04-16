"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import type { CommentWithAuthor } from "@/types/comment"
import {
  LATENCY_TIMEOUT_MS,
  type LatencyResult,
  type PendingLatencyEvent,
  makeSyntheticComment,
  sleep,
  summarizeLatency,
} from "@/lib/measurements/commentMeasurement"

export function useCommentLatencyMeasurement(
  prId: string,
  iterations: number,
  delayMs: number,
  observedComments: CommentWithAuthor[] | undefined,
  disabled: boolean
) {
  const [isLatencyRunning, setIsLatencyRunning] = useState(false)
  const [latencyResults, setLatencyResults] = useState<LatencyResult[]>([])
  const pendingLatencyRef = useRef<Map<string, PendingLatencyEvent>>(new Map())
  const latencySamplesRef = useRef<number[]>([])
  const latencyResolveRef = useRef<(() => void) | null>(null)
  const latencyExpectedCountRef = useRef(0)
  const queryClient = useQueryClient()

  const queryKey = useMemo(() => ["comments", prId] as const, [prId])

  useEffect(() => {
    if (!observedComments || pendingLatencyRef.current.size === 0) return

    for (const comment of observedComments) {
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
  }, [observedComments])

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
    if (!prId || isLatencyRunning || disabled) return

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

  const latestLatency = latencyResults[0]

  const latencyReport = useMemo(() => {
    if (!latestLatency) {
      return "latency 측정을 실행하면 요약 문장이 여기에 표시됩니다."
    }

    return [
      `시나리오: synthetic socket 이벤트 ${latestLatency.iterations}회`,
      "",
      `- 평균 latency: ${latestLatency.avgMs}ms`,
      `- p95 latency: ${latestLatency.p95Ms}ms`,
      `- 최소/최대 latency: ${latestLatency.minMs}ms / ${latestLatency.maxMs}ms`,
      `- 측정 페이지: /measurements/comments/latency?prId=${prId}`,
      `- 측정 날짜: ${new Date().toISOString().slice(0, 10)}`,
    ].join("\n")
  }, [latestLatency, prId])

  return {
    isLatencyRunning,
    latestLatency,
    latencyReport,
    runLatencyMeasurement,
  }
}
