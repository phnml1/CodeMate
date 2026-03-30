"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { textStyles } from "@/lib/styles"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart3 } from "lucide-react"
import type { IssueCategoryItem } from "@/lib/stats"

const CATEGORY_COLORS: Record<string, string> = {
  BUG: "#ef4444",
  SECURITY: "#7c3aed",
  PERFORMANCE: "#f59e0b",
  QUALITY: "#3b82f6",
  BEST_PRACTICE: "#22c55e",
}

const CATEGORY_LABELS: Record<string, string> = {
  BUG: "Bug",
  SECURITY: "Security",
  PERFORMANCE: "Performance",
  QUALITY: "Quality",
  BEST_PRACTICE: "Best Practice",
}

interface IssueCategoryChartProps {
  data: IssueCategoryItem[]
  loading: boolean
}

export default function IssueCategoryChart({
  data,
  loading,
}: IssueCategoryChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    label: CATEGORY_LABELS[item.name] ?? item.name,
    color: CATEGORY_COLORS[item.name] ?? "#94a3b8",
  }))

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 md:p-8">
      <h3 className={`${textStyles.sectionTitle} mb-4 sm:mb-6`}>
        이슈 카테고리 분포
      </h3>
      {loading ? (
        <div className="w-full h-70 sm:h-85">
          <Skeleton className="w-full h-full rounded-lg" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="w-full h-70 sm:h-85 flex flex-col items-center justify-center text-slate-400">
          <BarChart3 className="w-10 h-10 mb-3 text-slate-300" />
          <p className="text-sm font-medium">데이터가 없습니다</p>
        </div>
      ) : (
        <div className="w-full h-70 sm:h-85">
          <ResponsiveContainer width="100%" height="100%" minHeight={200}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 0 }}
            >
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 13, fill: "#475569", fontWeight: 600 }}
                width={100}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const item = payload[0].payload
                  return (
                    <div className="bg-white rounded-xl shadow-lg border border-slate-200 px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-semibold text-slate-900">
                          {item.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {item.count}건
                      </p>
                    </div>
                  )
                }}
                cursor={false}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={32}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
