"use client"

import { useMemo, useState } from "react"
import { Bot, Code2, Loader2, MessageSquare } from "lucide-react"
import CollaborationReviewThread from "@/components/collaboration/CollaborationReviewThread"
import SuggestionCard from "@/components/review/SuggestionCard"
import ReviewCompletedHeader from "@/components/review/ReviewPanel/ReviewCompletedState/ReviewCompletedHeader"
import ReviewSeverityFilterBar from "@/components/review/ReviewPanel/ReviewCompletedState/ReviewSeverityFilterBar"
import ReviewSummaryBox from "@/components/review/ReviewPanel/ReviewCompletedState/ReviewSummaryBox"
import ReviewEmptyState from "@/components/review/ReviewPanel/ReviewEmptyState"
import ReviewFailedState from "@/components/review/ReviewPanel/ReviewFailedState"
import ReviewProgressState from "@/components/review/ReviewPanel/ReviewProgressState"
import { Button } from "@/components/ui/button"
import { useCollaborationReviewMessages } from "@/hooks/useCollaborationReviewThreads"
import { usePRReviewActions } from "@/hooks/pr-detail/usePRReviewActions"
import { useReviewQuery } from "@/hooks/useReview"
import {
  getCompletedReviewData,
  type ReviewSeverityFilter,
} from "@/lib/reviewPanel"
import type { CollaborationReviewReference } from "@/types/collaboration"
import type { ReviewIssue } from "@/types/review"

type ThreadTarget = "overall" | number

export default function CollaborationAIReviewPanel({
  roomId,
  prId,
  currentUserId,
  canSend,
  realtimeConnected,
  focusReference,
  onOpenIssue,
}: {
  roomId: string
  prId: string
  currentUserId: string
  canSend: boolean
  realtimeConnected: boolean
  focusReference: CollaborationReviewReference | null
  onOpenIssue: (issue: ReviewIssue) => void
}) {
  const [filterSeverity, setFilterSeverity] =
    useState<ReviewSeverityFilter>("ALL")
  const [threadTarget, setThreadTarget] = useState<ThreadTarget | null | undefined>(undefined)
  const { data: review, isPending, isError, refetch } = useReviewQuery(prId, {
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === "PENDING" || status === "IN_PROGRESS" ? 3_000 : 15_000
    },
  })
  const { requestReview, isRequesting, requestError } = usePRReviewActions(prId)
  const focusedTarget = focusReference && focusReference.reviewId === review?.id
    ? focusReference.issueIndex ?? "overall"
    : null
  const activeThreadTarget = threadTarget === undefined ? focusedTarget : threadTarget
  const persistedReviewId = review && !review.id.startsWith("pending-")
    ? review.id
    : null
  const messagesQuery = useCollaborationReviewMessages(
    roomId,
    persistedReviewId,
    realtimeConnected
  )
  const messages = useMemo(
    () => messagesQuery.data?.messages ?? [],
    [messagesQuery.data?.messages]
  )

  const messageCounts = useMemo(() => {
    const counts = new Map<ThreadTarget, number>()
    for (const message of messages) {
      const target = message.reviewReference?.issueIndex ?? "overall"
      counts.set(target, (counts.get(target) ?? 0) + 1)
    }
    return counts
  }, [messages])

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        <Loader2 className="mr-2 size-4 animate-spin" /> AI 리뷰를 불러오는 중
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-rose-600">
        AI 리뷰를 불러오지 못했습니다.
        <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
          다시 시도
        </Button>
      </div>
    )
  }

  if (!review) {
    return (
      <div className="p-6">
        <ReviewEmptyState
          isRequesting={isRequesting}
          requestError={requestError}
          onRequestReview={requestReview}
        />
      </div>
    )
  }

  if (review.status === "FAILED") {
    return (
      <div className="p-6">
        <ReviewFailedState
          review={review}
          isRequesting={isRequesting}
          requestError={requestError}
          onRequestReview={requestReview}
        />
      </div>
    )
  }

  if (review.status === "PENDING" || review.status === "IN_PROGRESS") {
    return (
      <div className="p-6">
        <ReviewProgressState stage={review.stage} />
      </div>
    )
  }

  const view = getCompletedReviewData(review, filterSeverity)
  const thread = (target: ThreadTarget) => {
    const issueIndex = target === "overall" ? null : target
    const targetMessages = messages.filter(
      (message) => (message.reviewReference?.issueIndex ?? null) === issueIndex
    )
    return (
      <CollaborationReviewThread
        roomId={roomId}
        reviewId={review.id}
        issueIndex={issueIndex}
        currentUserId={currentUserId}
        canSend={canSend}
        messages={targetMessages}
        isPending={messagesQuery.isPending}
        isError={messagesQuery.isError}
        onRetry={() => void messagesQuery.refetch()}
      />
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex items-center gap-2">
          <Bot className="size-5 text-violet-600 dark:text-violet-400" />
          <h2 className="text-base font-semibold">AI 리뷰</h2>
          <time className="ml-auto text-xs text-slate-500" dateTime={review.reviewedAt}>
            {new Intl.DateTimeFormat("ko-KR", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(review.reviewedAt))}
          </time>
        </div>

        <ReviewCompletedHeader
          assessment={view.assessment}
          isRequesting={isRequesting}
          requestError={requestError}
          score={review.qualityScore}
          onRequestReview={requestReview}
        />
        {view.summary && <ReviewSummaryBox summary={view.summary} />}

        <section className="overflow-hidden rounded-xl border border-violet-200 dark:border-violet-900">
          <button
            type="button"
            onClick={() => setThreadTarget(activeThreadTarget === "overall" ? null : "overall")}
            aria-expanded={activeThreadTarget === "overall"}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold hover:bg-violet-50 dark:hover:bg-violet-950/30"
          >
            <MessageSquare className="size-4 text-violet-600 dark:text-violet-400" />
            전체 AI 리뷰에 코멘트
            <span className="ml-auto text-xs font-normal text-slate-500">
              {messageCounts.get("overall") ?? 0}개
            </span>
          </button>
          {activeThreadTarget === "overall" && thread("overall")}
        </section>

        {view.hasSuggestions ? (
          <section>
            <ReviewSeverityFilterBar
              counts={view.counts}
              filterSeverity={filterSeverity}
              totalCount={view.suggestions.length}
              onFilterChange={setFilterSeverity}
            />
            <div className="space-y-4">
              {view.sortedIssues.map((issue) => (
                <div key={issue.originalIndex} className="space-y-2">
                  <SuggestionCard issue={issue} />
                  <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex flex-wrap items-center gap-2 p-2">
                      {issue.lineNumber != null && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => onOpenIssue(issue)}
                        >
                          <Code2 /> 코드로 이동
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-expanded={activeThreadTarget === issue.originalIndex}
                        onClick={() => setThreadTarget(
                          activeThreadTarget === issue.originalIndex ? null : issue.originalIndex
                        )}
                      >
                        <MessageSquare /> 코멘트 {messageCounts.get(issue.originalIndex) ?? 0}개
                      </Button>
                    </div>
                    {activeThreadTarget === issue.originalIndex && thread(issue.originalIndex)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <p className="rounded-xl border border-slate-200 p-5 text-center text-sm text-slate-500 dark:border-slate-700">
            발견된 AI 리뷰 이슈가 없습니다.
          </p>
        )}
      </div>
    </div>
  )
}
