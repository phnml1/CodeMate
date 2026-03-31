import { auth } from "@/lib/auth"
import {
  fetchDashboardStats,
  fetchDashboardQualityTrend,
  fetchDashboardIssueSeverity,
  fetchDashboardRecentPRs,
} from "@/lib/dashboard"
import StatCards from "@/components/dashboard/stat-cards/StatCards"
import ChartsSection from "@/components/dashboard/charts/ChartsSection"
import RecentPRSection from "@/components/dashboard/recent-prs/RecentPRSection"

export default async function Page() {
  const session = await auth()
  if (!session?.user?.id) return null

  const [stats, qualityTrend, issueSeverity, recentPRs] = await Promise.all([
    fetchDashboardStats(session.user.id),
    fetchDashboardQualityTrend(session.user.id),
    fetchDashboardIssueSeverity(session.user.id),
    fetchDashboardRecentPRs(session.user.id),
  ])

  return (
    <div className="max-w-350 mx-auto space-y-4 sm:space-y-6">
      <StatCards stats={stats} />
      <ChartsSection qualityTrend={qualityTrend} issueSeverity={issueSeverity} />
      <RecentPRSection prs={recentPRs} />
    </div>
  )
}
