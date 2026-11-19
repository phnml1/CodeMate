import Link from "next/link"
import { AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react"
import ReviewNoIssuesState from "@/components/review/ReviewPanel/ReviewCompletedState/ReviewNoIssuesState"
import ReviewSuggestionList from "@/components/review/ReviewPanel/ReviewCompletedState/ReviewSuggestionList"
import ReviewSummaryBox from "@/components/review/ReviewPanel/ReviewCompletedState/ReviewSummaryBox"
import ReviewProgressState from "@/components/review/ReviewPanel/ReviewProgressState"
import ReviewScore from "@/components/review/ReviewScore"
import ReviewHistoryAutoRefresh from "@/components/reviews/ReviewHistoryAutoRefresh"
import { PageHeader } from "@/components/layout/PageHeader"
import { ASSESSMENT_LABEL } from "@/lib/review-ui"
import type { ReviewHistoryDetail as Detail } from "@/lib/reviews/history"
import { surfaceStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"

export default function ReviewHistoryDetail({ review }: { review: Detail }) {
  const issues = (review.aiSuggestions?.issues ?? []).map((issue, originalIndex) => ({
    ...issue,
    originalIndex,
  }))
  const assessment = review.aiSuggestions?.overallAssessment
    ? ASSESSMENT_LABEL[review.aiSuggestions.overallAssessment]
    : null
  const isActive = review.status === "PENDING" || review.status === "IN_PROGRESS"

  return (
    <>
      {isActive ? <ReviewHistoryAutoRefresh /> : null}
      <Link href="/reviews" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-300">
        <ArrowLeft size={16} />AI 리뷰 이력
      </Link>

      <PageHeader
        title={`#${review.pullRequest.number} AI 리뷰`}
        description={`${review.pullRequest.repo.name} · ${review.pullRequest.title}`}
        actions={
          <Link href={`/pulls/${review.pullRequest.id}?review=open`} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900">
            PR에서 보기<ExternalLink size={14} />
          </Link>
        }
      />

      <section className={cn(surfaceStyles.panel, surfaceStyles.panelPadding)}>
        {review.status === "FAILED" ? (
          <div className="flex items-start gap-3 rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
            <AlertTriangle className="mt-0.5 shrink-0" size={18} />
            <div><p className="font-semibold">AI 리뷰가 실패했습니다.</p><p className="mt-1 text-sm">{review.failureReason ?? "원인을 확인할 수 없습니다."}</p></div>
          </div>
        ) : isActive ? (
          <ReviewProgressState stage={review.stage} startedAt={review.reviewedAt} aiStartedAt={review.aiRequestedAt} />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <ReviewScore score={review.qualityScore} />
              {assessment ? <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold", assessment.color)}>{assessment.icon}{assessment.label}</span> : null}
            </div>
            {review.aiSuggestions?.summary ? <ReviewSummaryBox summary={review.aiSuggestions.summary} /> : null}
            {issues.length > 0 ? <ReviewSuggestionList issues={issues} /> : <ReviewNoIssuesState />}
          </div>
        )}
      </section>
    </>
  )
}
