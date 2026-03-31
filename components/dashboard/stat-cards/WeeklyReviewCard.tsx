import { Bot } from "lucide-react"
import StatCard from "./StatCard"

interface WeeklyReviewCardProps {
  weeklyReviews: number
  diff: number
}

export default function WeeklyReviewCard({ weeklyReviews, diff }: WeeklyReviewCardProps) {
  const diffText =
    diff > 0 ? `+${diff} vs 지난주` : diff < 0 ? `${diff} vs 지난주` : "지난주와 동일"
  const diffColor =
    diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-slate-500"

  return (
    <StatCard
      icon={Bot}
      value={`${weeklyReviews}건`}
      label="이번주 리뷰"
      badge={
        <span className={`text-xs font-semibold flex items-center gap-1 ${diffColor}`}>
          {diffText}
        </span>
      }
    />
  )
}
