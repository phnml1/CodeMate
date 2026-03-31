import { type DashboardStats } from "@/lib/dashboard"
import CodeQualityCard from "./CodeQualityCard"
import OpenPRCard from "./OpenPRCard"
import WeeklyReviewCard from "./WeeklyReviewCard"

export default function StatCards({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <CodeQualityCard
        score={stats.avgQualityScore}
        trend={stats.qualityScoreTrend}
      />
      <OpenPRCard
        openPRs={stats.openPRs}
        pendingReviewPRs={stats.pendingReviewPRs}
      />
      <WeeklyReviewCard
        weeklyReviews={stats.weeklyReviews}
        diff={stats.weeklyReviewsDiff}
      />
    </div>
  )
}
