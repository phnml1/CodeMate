import { Bot } from "lucide-react"
import StatCard from "./StatCard"

export default function WeeklyReviewCard() {
  return (
    <StatCard
      icon={Bot}
      value="23건"
      label="이번주 리뷰"
      badge={
        <span className="text-green-600 text-xs font-semibold flex items-center gap-1">+8 vs 지난주</span>
      }
    />
  )
}
