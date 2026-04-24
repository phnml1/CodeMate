"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { CircleDot } from "lucide-react"
import { surfaceStyles, textStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"
import type { IssueSeverityItem } from "@/lib/stats"
import {
  StatsChartEmpty,
  StatsChartError,
  StatsChartLoading,
} from "./StatsChartState"

interface IssueSeverityChartProps {
  data: IssueSeverityItem[]
  loading: boolean
  error?: string | null
  onRetry?: () => void
}

export default function IssueSeverityChart({
  data,
  loading,
  error,
  onRetry,
}: IssueSeverityChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div
      className={cn(
        "lg:col-span-2",
        surfaceStyles.panel,
        surfaceStyles.panelPadding
      )}
    >
      <h3 className={`${textStyles.sectionTitle} mb-4 sm:mb-6`}>
        Issue Severity
      </h3>
      {loading ? (
        <StatsChartLoading variant="pie" />
      ) : error ? (
        <StatsChartError message={error} onRetry={onRetry} />
      ) : data.length === 0 ? (
        <StatsChartEmpty icon={CircleDot} message="No issue severity data yet." />
      ) : (
        <div className="flex flex-col items-center gap-6">
          <div className="relative h-55 w-55 sm:h-65 sm:w-65">
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
                          {value} items ({Math.round((value / total) * 100)}%)
                        </p>
                      </div>
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-slate-900 dark:text-slate-50 sm:text-4xl">
                {total}
              </span>
              <span className="text-xs text-slate-400 sm:text-sm">Total Issues</span>
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
                  {item.value} items
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
