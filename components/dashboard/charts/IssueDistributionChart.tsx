"use client"

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"

const data = [
  { name: "HIGH", value: 15, color: "#ef4444" },
  { name: "MEDIUM", value: 35, color: "#f59e0b" },
  { name: "LOW", value: 50, color: "#3b82f6" },
]

const total = data.reduce((sum, d) => sum + d.value, 0)

export default function IssueDistributionChart() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-55 h-55 sm:w-65 sm:h-65">
        <ResponsiveContainer width="100%" height="100%">
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
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-slate-900 text-3xl sm:text-4xl font-bold">{total}개</span>
          <span className="text-slate-400 text-xs sm:text-sm">전체 이슈</span>
        </div>
      </div>
      <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4 w-full">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
              <span className="text-xs sm:text-sm font-semibold text-slate-700">{item.name}</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-900">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
