import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import {
  getCachedDashboardStats,
  getCachedDashboardQualityTrend,
  getCachedDashboardIssueSeverity,
  getCachedDashboardRecentPRs,
} from "@/lib/dashboard"
import StatCards from "@/components/dashboard/stat-cards/StatCards"
import ChartsSection from "@/components/dashboard/charts/ChartsSection"
import RecentPRSection from "@/components/dashboard/recent-prs/RecentPRSection"

export const metadata: Metadata = {
  title: "대시보드",
  description: "코드 품질 통계 및 최근 Pull Request 현황을 한눈에 확인하세요",
}

export default async function Page() {
  const session = await auth()
  if (!session?.user?.id) return null

  const [stats, qualityTrend, issueSeverity, recentPRs] = await Promise.all([
    getCachedDashboardStats(session.user.id),
    getCachedDashboardQualityTrend(session.user.id),
    getCachedDashboardIssueSeverity(session.user.id),
    getCachedDashboardRecentPRs(session.user.id),
  ])

  return (
    <div className="max-w-350 mx-auto space-y-4 sm:space-y-6">
      <StatCards stats={stats} />
      <ChartsSection qualityTrend={qualityTrend} issueSeverity={issueSeverity} />
      <RecentPRSection prs={recentPRs} />
    </div>
  )
}
