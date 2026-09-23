import type { Metadata } from "next"
import { Suspense } from "react"
import { requireCurrentUser } from "@/lib/dal/session"
import {
  getCachedDashboardStats,
  getCachedDashboardQualityTrend,
  getCachedDashboardIssueSeverity,
  getCachedDashboardRecentPRs,
} from "@/lib/dashboard"
import StatCards from "@/components/dashboard/stat-cards/StatCards"
import ChartsSection from "@/components/dashboard/charts/ChartsSection"
import RecentPRSection from "@/components/dashboard/recent-prs/RecentPRSection"
import { PageContainer } from "@/components/layout/PageContainer"
import {
  ChartSkeleton,
  RecentPRSkeleton,
  StatCardsSkeleton,
} from "@/components/dashboard/DashboardSectionSkeletons"

export const metadata: Metadata = {
  title: "대시보드",
  description: "코드 품질 통계 및 최근 Pull Request 현황을 한눈에 확인하세요",
}

async function Stats({ userId }: { userId: string }) {
  const stats = await getCachedDashboardStats(userId)
  return <StatCards stats={stats} />
}

async function Charts({ userId }: { userId: string }) {
  const [qualityTrend, issueSeverity] = await Promise.all([
    getCachedDashboardQualityTrend(userId),
    getCachedDashboardIssueSeverity(userId),
  ])
  return <ChartsSection qualityTrend={qualityTrend} issueSeverity={issueSeverity} />
}

async function RecentPRs({ userId }: { userId: string }) {
  const prs = await getCachedDashboardRecentPRs(userId)
  return <RecentPRSection prs={prs} />
}

export default async function Page() {
  const user = await requireCurrentUser()

  return (
    <PageContainer size="wide">
      <Suspense fallback={<StatCardsSkeleton />}>
        <Stats userId={user.id} />
      </Suspense>
      <Suspense fallback={<ChartSkeleton />}>
        <Charts userId={user.id} />
      </Suspense>
      <Suspense fallback={<RecentPRSkeleton />}>
        <RecentPRs userId={user.id} />
      </Suspense>
    </PageContainer>
  )
}
