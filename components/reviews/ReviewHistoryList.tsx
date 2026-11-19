import Link from "next/link"
import { ChevronLeft, ChevronRight, GitPullRequest } from "lucide-react"
import { REVIEW_STAGE_META } from "@/lib/reviewPanel"
import type {
  ReviewHistoryFilters,
  ReviewHistoryItem,
  ReviewHistoryResult,
} from "@/lib/reviews/history"
import { surfaceStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"

const STATUS_META = {
  PENDING: { label: "대기 중", className: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" },
  IN_PROGRESS: { label: "진행 중", className: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" },
  COMPLETED: { label: "완료", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" },
  FAILED: { label: "실패", className: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" },
} as const

const SEVERITY_LABEL = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
  CRITICAL: "심각",
} as const

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function pageHref(filters: ReviewHistoryFilters, page: number) {
  const params = new URLSearchParams()
  if (filters.query) params.set("q", filters.query)
  if (filters.repoId) params.set("repoId", filters.repoId)
  if (filters.status !== "ALL") params.set("status", filters.status)
  if (page > 1) params.set("page", String(page))
  const query = params.toString()
  return query ? `/reviews?${query}` : "/reviews"
}

function ReviewCard({ review }: { review: ReviewHistoryItem }) {
  const status = STATUS_META[review.status]
  const isCompleted = review.status === "COMPLETED"

  return (
    <Link
      href={`/reviews/${review.id}`}
      className={cn(
        surfaceStyles.interactiveCard,
        "group grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>{review.pullRequest.repo.name}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-300">
            <GitPullRequest size={12} />#{review.pullRequest.number}
          </span>
          <span>·</span>
          <time dateTime={review.reviewedAt}>{formatDate(review.reviewedAt)}</time>
        </div>
        <h2 className="mt-2 truncate text-base font-bold text-slate-900 group-hover:text-blue-700 dark:text-slate-50 dark:group-hover:text-blue-300">
          {review.pullRequest.title}
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", status.className)}>
            {status.label}
          </span>
          {review.status === "IN_PROGRESS" || review.status === "PENDING" ? (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {REVIEW_STAGE_META[review.stage].label}
            </span>
          ) : null}
          {isCompleted ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              심각도 {SEVERITY_LABEL[review.severity]}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-5 text-sm text-slate-500 dark:text-slate-400">
        <span>점수 <strong className="text-slate-900 dark:text-slate-50">{isCompleted ? review.qualityScore : "-"}</strong></span>
        <span>이슈 <strong className="text-slate-900 dark:text-slate-50">{isCompleted ? review.issueCount : "-"}</strong></span>
        <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  )
}

export default function ReviewHistoryList({
  filters,
  history,
}: {
  filters: ReviewHistoryFilters
  history: ReviewHistoryResult
}) {
  if (history.items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">조건에 맞는 AI 리뷰가 없습니다.</p>
        <p className="mt-2 text-xs text-slate-400">PR 상세에서 AI 리뷰를 요청하면 이곳에 기록됩니다.</p>
        <Link href="/pulls" className="mt-5 inline-flex rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
          Pull Request 보기
        </Link>
      </div>
    )
  }

  const { page, total, totalPages } = history.pagination

  return (
    <section aria-labelledby="review-history-title" className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 id="review-history-title" className="text-lg font-bold text-slate-900 dark:text-slate-50">AI 리뷰 이력</h2>
        <span className="text-sm text-slate-500 dark:text-slate-400">총 {total}건</span>
      </div>

      <div className="space-y-3">
        {history.items.map((review) => <ReviewCard key={review.id} review={review} />)}
      </div>

      {totalPages > 1 ? (
        <nav aria-label="AI 리뷰 이력 페이지" className="flex items-center justify-center gap-2 pt-2">
          {page > 1 ? (
            <Link href={pageHref(filters, page - 1)} aria-label="이전 페이지" className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"><ChevronLeft size={16} /></Link>
          ) : null}
          <span className="px-3 text-sm font-medium text-slate-600 dark:text-slate-300">{page} / {totalPages}</span>
          {page < totalPages ? (
            <Link href={pageHref(filters, page + 1)} aria-label="다음 페이지" className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"><ChevronRight size={16} /></Link>
          ) : null}
        </nav>
      ) : null}
    </section>
  )
}
