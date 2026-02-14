import { Star } from "lucide-react"
import StatCard from "./StatCard"

export default function CodeQualityCard() {
  return (
    <StatCard
      icon={Star}
      value="87점"
      label="평균 코드 품질"
      badge={
        <span className="text-green-600 text-xs font-semibold flex items-center gap-1">+5% ↗</span>
      }
    />
  )
}
