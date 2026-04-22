"use client"

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { BarChart3 } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { surfaceStyles, textStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"
import type { PRTrendItem } from "@/lib/stats"

interface PRTrendChartProps {
  data: PRTrendItem[]
  loading: boolean
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-md border border-slate-200 bg-white px-5 py-3 shadow-lg dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-2 text-sm font-bold text-slate-900 dark:text-slate-50">
        {label}
      </div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <div
            className="size-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-600 dark:text-slate-400">
            {entry.name}:
          </span>
          <span className="font-semibold text-slate-900 dark:text-slate-50">
            {entry.value}건
          </span>
        </div>
      ))}
    </div>
  )
}

export default function PRTrendChart({ data, loading }: PRTrendChartProps) {
  return (
    <div className={cn("lg:col-span-3", surfaceStyles.panel, surfaceStyles.panelPadding)}>
      <h3 className={`${textStyles.sectionTitle} mb-4 sm:mb-6`}>
        PR 활동 추이
      </h3>
      {loading ? (
        <div className="h-70 w-full sm:h-85">
          <Skeleton className="h-full w-full rounded-md" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-70 w-full flex-col items-center justify-center text-slate-400 sm:h-85">
          <BarChart3 className="mb-3 size-10 text-slate-300" />
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
                <linearGradient id="openGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="mergedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="closedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.05} />
                </linearGradient>
              </defs>
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
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Area
                type="monotone"
                dataKey="open"
                name="Open"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#openGradient)"
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="merged"
                name="Merged"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#mergedGradient)"
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="closed"
                name="Closed"
                stroke="#94a3b8"
                strokeWidth={2}
                fill="url(#closedGradient)"
                stackId="1"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
