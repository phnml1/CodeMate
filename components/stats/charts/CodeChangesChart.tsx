"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { textStyles } from "@/lib/styles"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart3 } from "lucide-react"
import type { CodeChangesItem } from "@/lib/stats"

interface CodeChangesChartProps {
  data: CodeChangesItem[]
  loading: boolean
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  const item = payload[0]?.payload as CodeChangesItem | undefined
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 px-5 py-3">
      <div className="text-slate-900 font-bold text-sm mb-2">{label}</div>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
          <span className="text-slate-600">추가:</span>
          <span className="font-semibold text-emerald-600">
            +{item?.additions?.toLocaleString() ?? 0}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="text-slate-600">삭제:</span>
          <span className="font-semibold text-rose-600">
            -{item?.deletions?.toLocaleString() ?? 0}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-600">변경 파일:</span>
          <span className="font-semibold text-slate-900">
            {item?.files ?? 0}개
          </span>
        </div>
      </div>
    </div>
  )
}

export default function CodeChangesChart({
  data,
  loading,
}: CodeChangesChartProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 md:p-8">
      <h3 className={`${textStyles.sectionTitle} mb-4 sm:mb-6`}>
        코드 변경량 추이
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
                name="추가"
                fill="#60a5fa"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="deletions"
                name="삭제"
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
