"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { textStyles } from "@/lib/styles"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart3 } from "lucide-react"
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
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 px-5 py-3">
      <div className="text-slate-900 font-bold text-sm mb-2">{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-600">{entry.name}:</span>
          <span className="font-semibold text-slate-900">
            {entry.value}건
          </span>
        </div>
      ))}
    </div>
  )
}

export default function PRTrendChart({ data, loading }: PRTrendChartProps) {
  return (
    <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 md:p-8">
      <h3 className={`${textStyles.sectionTitle} mb-4 sm:mb-6`}>
        PR 활동 추이
      </h3>
      {loading ? (
        <div className="w-full h-70 sm:h-85">
          <Skeleton className="w-full h-full rounded-lg" />
        </div>
      ) : data.length === 0 ? (
        <div className="w-full h-70 sm:h-85 flex flex-col items-center justify-center text-slate-400">
          <BarChart3 className="w-10 h-10 mb-3 text-slate-300" />
          <p className="text-sm font-medium">데이터가 없습니다</p>
        </div>
      ) : (
        <div className="w-full h-70 sm:h-85">
          <ResponsiveContainer width="100%" height="100%" minHeight={200}>
            <AreaChart
              data={data}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="openGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop
                    offset="100%"
                    stopColor="#3b82f6"
                    stopOpacity={0.05}
                  />
                </linearGradient>
                <linearGradient
                  id="mergedGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop
                    offset="100%"
                    stopColor="#22c55e"
                    stopOpacity={0.05}
                  />
                </linearGradient>
                <linearGradient
                  id="closedGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.3} />
                  <stop
                    offset="100%"
                    stopColor="#94a3b8"
                    stopOpacity={0.05}
                  />
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
