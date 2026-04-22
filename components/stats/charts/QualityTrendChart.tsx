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

import { Skeleton } from "@/components/ui/skeleton"
import { surfaceStyles, textStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"
import type { QualityTrendItem } from "@/lib/stats"

interface QualityTrendChartProps {
  data: QualityTrendItem[]
  loading: boolean
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
        점수: {payload[0].value}점
      </div>
      <div className="mt-1 text-xs text-blue-500">{label}</div>
    </div>
  )
}

export default function QualityTrendChart({
  data,
  loading,
}: QualityTrendChartProps) {
  return (
    <div className={cn("lg:col-span-3", surfaceStyles.panel, surfaceStyles.panelPadding)}>
      <h3 className={`${textStyles.sectionTitle} mb-4 sm:mb-6`}>
        코드 품질 추이
      </h3>
      {loading ? (
        <div className="h-70 w-full sm:h-85">
          <Skeleton className="h-full w-full rounded-md" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-70 w-full flex-col items-center justify-center text-slate-400 sm:h-85">
          <TrendingUp className="mb-3 size-10 text-slate-300" />
          <p className="text-sm font-medium">데이터가 없습니다</p>
        </div>
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
