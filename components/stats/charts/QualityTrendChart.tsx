"use client"

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { TrendingUp } from "lucide-react"
import { surfaceStyles, textStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"
import type { QualityTrendItem } from "@/lib/stats"
import {
  StatsChartEmpty,
  StatsChartError,
  StatsChartLoading,
} from "./StatsChartState"

interface QualityTrendChartProps {
  data: QualityTrendItem[]
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
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-md border border-slate-200 bg-white px-5 py-3 text-center shadow-lg dark:border-slate-800 dark:bg-slate-950">
      <div className="text-sm font-bold text-slate-900 dark:text-slate-50">
        Score: {payload[0].value}
      </div>
      <div className="mt-1 text-xs text-blue-500">{label}</div>
    </div>
  )
}

export default function QualityTrendChart({
  data,
  loading,
  error,
  onRetry,
}: QualityTrendChartProps) {
  return (
    <div
      className={cn(
        "lg:col-span-3",
        surfaceStyles.panel,
        surfaceStyles.panelPadding
      )}
    >
      <h3 className={`${textStyles.sectionTitle} mb-4 sm:mb-6`}>
        Quality Trend
      </h3>
      {loading ? (
        <StatsChartLoading />
      ) : error ? (
        <StatsChartError message={error} onRetry={onRetry} />
      ) : data.length === 0 ? (
        <StatsChartEmpty icon={TrendingUp} message="No quality review data yet." />
      ) : (
        <div className="h-70 w-full sm:h-85">
          <ResponsiveContainer width="100%" height="100%" minHeight={200}>
            <AreaChart
              data={data}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="qualityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                dy={10}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
              />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Area
                type="monotone"
                dataKey="avgScore"
                stroke="#4d9be8"
                strokeWidth={2.5}
                fill="url(#qualityGradient)"
                dot={{
                  r: 3,
                  fill: "#4d9be8",
                  stroke: "#fff",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 6,
                  fill: "#fff",
                  stroke: "#4d9be8",
                  strokeWidth: 2.5,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
