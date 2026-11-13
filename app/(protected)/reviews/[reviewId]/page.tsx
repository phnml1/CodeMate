import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PageContainer } from "@/components/layout/PageContainer"
import ReviewHistoryDetail from "@/components/reviews/ReviewHistoryDetail"
import { requireCurrentUser } from "@/lib/dal/session"
import { getReviewHistoryDetail } from "@/lib/reviews/history"

export const metadata: Metadata = {
  title: "AI 리뷰 상세",
  description: "AI 코드 리뷰 결과를 확인하세요",
}

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ reviewId: string }>
}) {
  const user = await requireCurrentUser()
  const { reviewId } = await params
  const review = await getReviewHistoryDetail(user.id, reviewId)

  if (!review) notFound()

  return (
    <PageContainer>
      <ReviewHistoryDetail review={review} />
    </PageContainer>
  )
}
