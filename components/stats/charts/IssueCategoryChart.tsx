"use client"

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { BarChart3 } from "lucide-react"
import { surfaceStyles, textStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"
import type { IssueCategoryItem } from "@/lib/stats"
import {
  StatsChartEmpty,
  StatsChartError,
  StatsChartLoading,
} from "./StatsChartState"

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
  error?: string | null
  onRetry?: () => void
}

export default function IssueCategoryChart({
  data,
  loading,
  error,
  onRetry,
}: IssueCategoryChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    label: CATEGORY_LABELS[item.name] ?? item.name,
    color: CATEGORY_COLORS[item.name] ?? "#94a3b8",
  }))

  return (
    <div className={cn(surfaceStyles.panel, surfaceStyles.panelPadding)}>
      <h3 className={`${textStyles.sectionTitle} mb-4 sm:mb-6`}>
        Issue Categories
      </h3>
      {loading ? (
        <StatsChartLoading />
      ) : error ? (
        <StatsChartError message={error} onRetry={onRetry} />
      ) : chartData.length === 0 ? (
        <StatsChartEmpty icon={BarChart3} message="No issue category data yet." />
      ) : (
        <div className="h-70 w-full sm:h-85">
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
                    <div className="rounded-md border border-slate-200 bg-white px-5 py-3 shadow-lg dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex items-center gap-2">
                        <div
                          className="size-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                          {item.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {item.count} items
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
