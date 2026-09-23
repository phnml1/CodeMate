import {
  ChartSkeleton,
  RecentPRSkeleton,
  StatCardsSkeleton,
} from "@/components/dashboard/DashboardSectionSkeletons"
import { PageContainer } from "@/components/layout/PageContainer"

export default function DashboardLoading() {
  return (
    <PageContainer size="wide">
      <StatCardsSkeleton />
      <ChartSkeleton />
      <RecentPRSkeleton />
    </PageContainer>
  )
}
