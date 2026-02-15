"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const data = [
  { day: "1일", score: 72 },
  { day: "3일", score: 75 },
  { day: "5일", score: 78 },
  { day: "7일", score: 76 },
  { day: "9일", score: 80 },
  { day: "11일", score: 78 },
  { day: "13일", score: 83 },
  { day: "15일", score: 82 },
  { day: "17일", score: 85 },
  { day: "19일", score: 87 },
  { day: "23일", score: 89 },
  { day: "27일", score: 91 },
  { day: "30일", score: 88 },
]

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
      <div className="text-slate-900 font-bold text-sm">점수: {payload[0].value}점</div>
      <div className="text-blue-500 text-xs mt-1">{label}</div>
    </div>
  )
}

export default function CodeQualityChart() {
  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={200}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="day"
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
          dataKey="score"
          stroke="#4d9be8"
          strokeWidth={2.5}
          fill="url(#scoreGradient)"
          dot={{ r: 3, fill: "#4d9be8", stroke: "#fff", strokeWidth: 2 }}
          activeDot={{ r: 6, fill: "#fff", stroke: "#4d9be8", strokeWidth: 2.5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
