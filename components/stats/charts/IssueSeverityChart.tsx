"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { CircleDot } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { surfaceStyles, textStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"
import type { IssueSeverityItem } from "@/lib/stats"

interface IssueSeverityChartProps {
  data: IssueSeverityItem[]
  loading: boolean
}

export default function IssueSeverityChart({
  data,
  loading,
}: IssueSeverityChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className={cn("lg:col-span-2", surfaceStyles.panel, surfaceStyles.panelPadding)}>
      <h3 className={`${textStyles.sectionTitle} mb-4 sm:mb-6`}>
        이슈 심각도 분포
      </h3>
      {loading ? (
        <div className="flex flex-col items-center gap-6">
          <Skeleton className="size-48 rounded-full" />
          <div className="w-full space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-4 w-full rounded" />
            ))}
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-70 flex-col items-center justify-center text-slate-400">
          <CircleDot className="mb-3 size-10 text-slate-300" />
          <p className="text-sm font-medium">데이터가 없습니다</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6">
          <div className="relative h-55 w-55 sm:h-65 sm:w-65">
            <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={200}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="85%"
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  strokeWidth={0}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const { name, value, color } = payload[0].payload

                    return (
                      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-md dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex items-center gap-2">
                          <div
                            className="size-3 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {name}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                          {value}건 ({Math.round((value / total) * 100)}%)
                        </p>
                      </div>
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-slate-900 dark:text-slate-50 sm:text-4xl">
                {total}건
              </span>
              <span className="text-xs text-slate-400 sm:text-sm">전체 이슈</span>
            </div>
          </div>
          <div className="w-full space-y-3 sm:space-y-4">
            {data.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div
                    className="size-3 rounded-full shadow-sm sm:size-4"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 sm:text-sm">
                    {item.name}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-50 sm:text-sm">
                  {item.value}건
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
