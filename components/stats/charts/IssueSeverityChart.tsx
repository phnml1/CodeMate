"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { textStyles } from "@/lib/styles"
import { Skeleton } from "@/components/ui/skeleton"
import { CircleDot } from "lucide-react"
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
    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 md:p-8">
      <h3 className={`${textStyles.sectionTitle} mb-4 sm:mb-6`}>
        이슈 심각도 분포
      </h3>
      {loading ? (
        <div className="flex flex-col items-center gap-6">
          <Skeleton className="w-48 h-48 rounded-full" />
          <div className="space-y-3 w-full">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-4 w-full rounded" />
            ))}
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="h-70 flex flex-col items-center justify-center text-slate-400">
          <CircleDot className="w-10 h-10 mb-3 text-slate-300" />
          <p className="text-sm font-medium">데이터가 없습니다</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-55 h-55 sm:w-65 sm:h-65">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minHeight={200}
              minWidth={200}
            >
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
                      <div className="rounded-lg border bg-white px-3 py-2 shadow-md">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-sm font-semibold text-slate-700">
                            {name}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {value}건 (
                          {Math.round((value / total) * 100)}%)
                        </p>
                      </div>
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-slate-900 text-3xl sm:text-4xl font-bold">
                {total}건
              </span>
              <span className="text-slate-400 text-xs sm:text-sm">
                전체 이슈
              </span>
            </div>
          </div>
          <div className="space-y-3 sm:space-y-4 w-full">
            {data.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div
                    className="w-3 h-3 sm:w-4 sm:h-4 rounded-full shadow-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs sm:text-sm font-semibold text-slate-700">
                    {item.name}
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-900">
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
