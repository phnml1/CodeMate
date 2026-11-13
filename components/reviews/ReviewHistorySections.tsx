import ReviewHistoryAutoRefresh from "@/components/reviews/ReviewHistoryAutoRefresh"
import ReviewHistoryFilters from "@/components/reviews/ReviewHistoryFilters"
import ReviewHistoryList from "@/components/reviews/ReviewHistoryList"
import ReviewStats from "@/components/reviews/ReviewStats"
import { getConnectedRepositoriesForUser } from "@/lib/dal/repositories"
import {
  getReviewHistory,
  getReviewHistoryStats,
  type ReviewHistoryFilters as ReviewHistoryFilterState,
} from "@/lib/reviews/history"

interface ReviewSectionProps {
  userId: string
}

interface FilteredReviewSectionProps extends ReviewSectionProps {
  filters: ReviewHistoryFilterState
}

export async function ReviewStatsSection({ userId }: ReviewSectionProps) {
  const stats = await getReviewHistoryStats(userId)

  return <ReviewStats stats={stats} />
}

export async function ReviewFiltersSection({
  userId,
  filters,
}: FilteredReviewSectionProps) {
  const repositories = await getConnectedRepositoriesForUser(userId)

  return (
    <ReviewHistoryFilters filters={filters} repositories={repositories} />
  )
}

export async function ReviewHistorySection({
  userId,
  filters,
}: FilteredReviewSectionProps) {
  const history = await getReviewHistory(userId, filters)

  return (
    <>
      {history.hasActiveReview ? <ReviewHistoryAutoRefresh /> : null}
      <ReviewHistoryList filters={filters} history={history} />
    </>
  )
}
