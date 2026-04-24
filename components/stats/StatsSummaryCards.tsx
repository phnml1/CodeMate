import {
  AlertTriangle,
  GitMerge,
  GitPullRequest,
  MessageSquare,
  RefreshCw,
  Star,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { StatsOverview } from "@/lib/stats"
import { layoutStyles, surfaceStyles } from "@/lib/styles"

interface StatsSummaryCardsProps {
  overview: StatsOverview
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

export default function StatsSummaryCards({
  overview,
  loading = false,
  error,
  onRetry,
}: StatsSummaryCardsProps) {
  const commentResolutionRate =
    overview.totalComments > 0
      ? Math.round((overview.resolvedComments / overview.totalComments) * 1000) / 10
      : 0

  const cards = [
    {
      icon: GitPullRequest,
      value: `${overview.totalPRs}`,
      label: "Total PRs",
      badge: (
        <span className="text-xs font-semibold text-purple-600">
          MERGED {overview.mergedPRs}
        </span>
      ),
    },
    {
      icon: Star,
      value: `${overview.avgQualityScore}`,
      label: "Average quality score",
      badge: (
        <span className="flex items-center gap-1 text-xs font-semibold text-blue-600">
          <TrendingUp className="h-3 w-3" /> Quality signal
        </span>
      ),
    },
    {
      icon: AlertTriangle,
      value: `${overview.totalIssues}`,
      label: "Total issues",
      badge: (
        <span className="text-xs font-semibold text-amber-600">
          Review findings
        </span>
      ),
    },
    {
      icon: GitMerge,
      value: `${overview.mergeRate}%`,
      label: "Merge rate",
      badge: (
        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
          <MessageSquare className="h-3 w-3" />
          Resolved comments {commentResolutionRate}%
        </span>
      ),
    },
  ]

  if (loading) {
    return (
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 ${layoutStyles.gridGap}`}
      >
        {cards.map((card) => (
          <div key={card.label} className={surfaceStyles.interactiveCard}>
            <div className="mb-4 flex items-start justify-between sm:mb-6">
              <Skeleton className="h-10 w-10 rounded-full sm:h-12 sm:w-12" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-10 w-24 rounded sm:h-12 sm:w-28" />
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className={surfaceStyles.panel}>
        <div className="flex flex-col gap-4 px-6 py-8 text-center sm:items-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertTriangle size={20} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Failed to load overview metrics
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{error}</p>
          </div>
          {onRetry && (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw size={14} />
              Retry overview
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 ${layoutStyles.gridGap}`}
    >
      {cards.map((card) => (
        <div key={card.label} className={surfaceStyles.interactiveCard}>
          <div className="mb-4 flex items-start justify-between sm:mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30 sm:h-12 sm:w-12">
              <card.icon className="h-5 w-5 text-white sm:h-6 sm:w-6" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold leading-none text-slate-900 sm:text-4xl md:text-5xl">
              {card.value}
            </div>
            <div className="text-sm font-medium text-slate-500">{card.label}</div>
            <div className="mt-3">{card.badge}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
