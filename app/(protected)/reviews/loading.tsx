import { PageContainer } from "@/components/layout/PageContainer"
import {
  ReviewFiltersSkeleton,
  ReviewHistoryListSkeleton,
  ReviewStatsSkeleton,
} from "@/components/reviews/ReviewHistorySkeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function ReviewsLoading() {
  return (
    <PageContainer>
      <div className="space-y-2"><Skeleton className="h-9 w-28" /><Skeleton className="h-4 w-80 max-w-full" /></div>
      <div className="flex gap-3 border-b border-slate-200 pb-3"><Skeleton className="h-8 w-20" /><Skeleton className="h-8 w-24" /></div>
      <ReviewStatsSkeleton />
      <ReviewFiltersSkeleton />
      <ReviewHistoryListSkeleton />
    </PageContainer>
  )
}
