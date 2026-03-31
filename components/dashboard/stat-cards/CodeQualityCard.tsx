import { Star } from "lucide-react"
import StatCard from "./StatCard"

interface CodeQualityCardProps {
  score: number
  trend: number
}

export default function CodeQualityCard({ score, trend }: CodeQualityCardProps) {
  const trendText =
    trend > 0 ? `+${trend}% ↗` : trend < 0 ? `${trend}% ↘` : "변동 없음"
  const trendColor =
    trend > 0
      ? "text-green-600"
      : trend < 0
        ? "text-red-600"
        : "text-slate-500"

  return (
    <StatCard
      icon={Star}
      value={`${score}점`}
      label="평균 코드 품질"
      badge={
        <span
          className={`text-xs font-semibold flex items-center gap-1 ${trendColor}`}
        >
          {trendText}
        </span>
      }
    />
  )
}
