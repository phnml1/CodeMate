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
import { TrendingUp } from "lucide-react"
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
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 px-5 py-3 text-center">
      <div className="text-slate-900 font-bold text-sm">
        점수: {payload[0].value}점
      </div>
      <div className="text-blue-500 text-xs mt-1">{label}</div>
    </div>
  )
}

export default function QualityTrendChart({
  data,
  loading,
}: QualityTrendChartProps) {
  return (
    <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 md:p-8">
      <h3 className={`${textStyles.sectionTitle} mb-4 sm:mb-6`}>
        코드 품질 추이
      </h3>
      {loading ? (
        <div className="w-full h-70 sm:h-85">
          <Skeleton className="w-full h-full rounded-lg" />
        </div>
      ) : data.length === 0 ? (
        <div className="w-full h-70 sm:h-85 flex flex-col items-center justify-center text-slate-400">
          <TrendingUp className="w-10 h-10 mb-3 text-slate-300" />
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
                  id="qualityGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.3} />
                  <stop
                    offset="100%"
                    stopColor="#60a5fa"
                    stopOpacity={0.05}
                  />
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
