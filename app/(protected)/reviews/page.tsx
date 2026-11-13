import type { Metadata } from "next"
import { Suspense } from "react"
import { BotMessageSquare } from "lucide-react"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import {
  ReviewFiltersSection,
  ReviewHistorySection,
  ReviewStatsSection,
} from "@/components/reviews/ReviewHistorySections"
import {
  ReviewFiltersSkeleton,
  ReviewHistoryListSkeleton,
  ReviewStatsSkeleton,
} from "@/components/reviews/ReviewHistorySkeletons"
import ReviewTabs from "@/components/reviews/ReviewTabs"
import { requireCurrentUser } from "@/lib/dal/session"
import { parseReviewHistoryFilters } from "@/lib/reviews/history"

export const metadata: Metadata = {
  title: "AI 리뷰 이력",
  description: "저장소별 AI 코드 리뷰 결과와 진행 상태를 확인하세요",
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireCurrentUser()
  const filters = parseReviewHistoryFilters(await searchParams)

  return (
    <PageContainer>
      <PageHeader
        title="리뷰"
        description="AI 분석 결과와 작성된 코드 리뷰를 한곳에서 확인하세요."
        icon={<BotMessageSquare size={18} />}
      />
      <ReviewTabs active="ai" />
      <Suspense fallback={<ReviewStatsSkeleton />}>
        <ReviewStatsSection userId={user.id} />
      </Suspense>
      <Suspense fallback={<ReviewFiltersSkeleton />}>
        <ReviewFiltersSection userId={user.id} filters={filters} />
      </Suspense>
      <Suspense fallback={<ReviewHistoryListSkeleton />}>
        <ReviewHistorySection userId={user.id} filters={filters} />
      </Suspense>
    </PageContainer>
  )
}
