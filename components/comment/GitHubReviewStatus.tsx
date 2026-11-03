"use client"

import { useEffect, useState } from "react"
import { Github, Loader2, RotateCcw } from "lucide-react"
import { usePublishGitHubReview } from "@/hooks/useComments"

const publishedBadgeClassName = "inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"

export default function GitHubReviewStatus({
  commentId,
  status,
  url,
  error,
  statusUpdatedAt,
  prId,
  roomId,
  canRetry = true,
}: {
  commentId: string
  status?: "NOT_REQUESTED" | "PUBLISHING" | "PUBLISHED" | "FAILED"
  url?: string | null
  error?: string | null
  statusUpdatedAt?: string | null
  prId?: string
  roomId?: string
  canRetry?: boolean
}) {
  const publish = usePublishGitHubReview(prId, roomId)
  const [now, setNow] = useState(0)
  useEffect(() => {
    if (status !== "PUBLISHING") return
    const timer = window.setInterval(() => setNow(Date.now()), 10_000)
    return () => window.clearInterval(timer)
  }, [status])
  if (!status || status === "NOT_REQUESTED") return null

  if (status === "PUBLISHED") {
    return url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className={publishedBadgeClassName}>
        <Github className="size-3" /> GitHub에서 보기
      </a>
    ) : <span className={publishedBadgeClassName}><Github className="size-3" /> GitHub 등록됨</span>
  }

  const stale = status === "PUBLISHING" && statusUpdatedAt &&
    now - new Date(statusUpdatedAt).getTime() > 120_000
  if ((status === "PUBLISHING" && !stale) || publish.isPending) {
    return <span role="status" className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-200"><Loader2 className="size-3 animate-spin" /> GitHub 리뷰 등록 중...</span>
  }

  if (!canRetry) {
    return <span className="inline-flex items-center gap-1 text-xs text-rose-600"><Github className="size-3" /> GitHub 전송 실패</span>
  }

  const reason = publish.error?.message ?? error
  return (
    <span className="inline-flex max-w-full flex-col items-end gap-1 text-right">
      <button
        type="button"
        title={reason ?? undefined}
        aria-label={`GitHub 리뷰 ${stale ? "전송 상태 확인" : "전송 실패"}, 재시도${reason ? `: ${reason}` : ""}`}
        onClick={() => publish.mutate(commentId)}
        className="inline-flex items-center gap-1 text-xs text-rose-600 hover:underline"
      >
        <RotateCcw className="size-3" /> {stale ? "GitHub 전송 상태 확인" : "GitHub 전송 실패 · 재시도"}
      </button>
      {reason && <span role="status" className="max-w-72 break-words rounded bg-white/90 px-1 text-xs text-rose-700 dark:bg-slate-950/90 dark:text-rose-300">{reason}</span>}
    </span>
  )
}
