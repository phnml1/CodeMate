"use client"

import { useSyncExternalStore } from "react"

import {
  getRenderCountSnapshot,
  isRenderMeasurementEnabled,
  resetRenderCounts,
  subscribeRenderCounts,
} from "@/lib/measurements/renderCounter"

type RenderCountSnapshot = Record<string, number>

const trackedRows = [
  { key: "CommentList", label: "CommentList renders" },
  { key: "CommentItem", label: "CommentItem renders" },
  { key: "CommentItem:root", label: "Top-level CommentItem renders" },
  { key: "CommentItem:reply", label: "Reply CommentItem renders" },
]

const emptySnapshot: RenderCountSnapshot = {}

export default function CommentRenderMetricsPanel({ prId }: { prId: string }) {
  const snapshot = useSyncExternalStore<RenderCountSnapshot>(
    subscribeRenderCounts,
    getRenderCountSnapshot,
    () => emptySnapshot
  )

  if (!isRenderMeasurementEnabled()) return null

  return (
    <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/60">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600">
            Render Metrics
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            `?measureRenders=1` query flag is active. These counts are the secondary proof for the
            real PR comment UI.
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Suggested capture path: `/pulls/{prId}?measureRenders=1`
          </p>
        </div>
        <button
          type="button"
          onClick={resetRenderCounts}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Counter reset
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {trackedRows.map((row) => (
          <div
            key={row.key}
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-950"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{row.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-50">
              {snapshot[row.key] ?? 0}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Current PR: <span className="font-mono">{prId}</span>
      </p>
    </div>
  )
}
