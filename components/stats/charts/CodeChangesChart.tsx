"use client"

import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { BarChart3 } from "lucide-react"
import { surfaceStyles, textStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"
import type { CodeChangesItem } from "@/lib/stats"
import {
  StatsChartEmpty,
  StatsChartError,
  StatsChartLoading,
} from "./StatsChartState"

interface CodeChangesChartProps {
  data: CodeChangesItem[]
  loading: boolean
  error?: string | null
  onRetry?: () => void
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  // Recharts passes each bar series with library-specific metadata.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  const item = payload[0]?.payload as CodeChangesItem | undefined

  return (
    <div className="rounded-md border border-slate-200 bg-white px-5 py-3 shadow-lg dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-2 text-sm font-bold text-slate-900 dark:text-slate-50">
        {label}
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs">
          <div className="size-2.5 rounded-full bg-blue-400" />
          <span className="text-slate-600 dark:text-slate-400">Additions:</span>
          <span className="font-semibold text-emerald-600">
            +{item?.additions?.toLocaleString() ?? 0}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="size-2.5 rounded-full bg-red-400" />
          <span className="text-slate-600 dark:text-slate-400">Deletions:</span>
          <span className="font-semibold text-rose-600">
            -{item?.deletions?.toLocaleString() ?? 0}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-600 dark:text-slate-400">Changed files:</span>
          <span className="font-semibold text-slate-900 dark:text-slate-50">
            {item?.files ?? 0}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function CodeChangesChart({
  data,
  loading,
  error,
  onRetry,
}: CodeChangesChartProps) {
  return (
    <div className={cn(surfaceStyles.panel, surfaceStyles.panelPadding)}>
      <h3 className={`${textStyles.sectionTitle} mb-4 sm:mb-6`}>
        Code Changes
      </h3>
      {loading ? (
        <StatsChartLoading />
      ) : error ? (
        <StatsChartError message={error} onRetry={onRetry} />
      ) : data.length === 0 ? (
        <StatsChartEmpty icon={BarChart3} message="No code change data yet." />
      ) : (
        <div className="h-70 w-full sm:h-85">
          <ResponsiveContainer width="100%" height="100%" minHeight={200}>
            <BarChart
              data={data}
              margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
            >
              <XAxis
                dataKey="week"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
              />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingBottom: 12 }}
              />
              <Bar
                dataKey="additions"
                name="Additions"
                fill="#60a5fa"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="deletions"
                name="Deletions"
                fill="#f87171"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
