import {
  GitPullRequest,
  Star,
  AlertTriangle,
  GitMerge,
  MessageSquare,
  TrendingUp,
} from "lucide-react"
import type { StatsOverview } from "@/lib/stats"

interface StatsSummaryCardsProps {
  overview: StatsOverview
}

export default function StatsSummaryCards({
  overview,
}: StatsSummaryCardsProps) {
  const commentResRate =
    overview.totalComments > 0
      ? Math.round(
          (overview.resolvedComments / overview.totalComments) * 1000
        ) / 10
      : 0

  const cards = [
    {
      icon: GitPullRequest,
      value: `${overview.totalPRs}`,
      label: "총 PR 수",
      badge: (
        <span className="text-purple-600 text-xs font-semibold">
          MERGED {overview.mergedPRs}건
        </span>
      ),
    },
    {
      icon: Star,
      value: `${overview.avgQualityScore}점`,
      label: "평균 품질 점수",
      badge: (
        <span className="text-blue-600 text-xs font-semibold flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> 품질 지표
        </span>
      ),
    },
    {
      icon: AlertTriangle,
      value: `${overview.totalIssues}`,
      label: "총 이슈 수",
      badge: (
        <span className="text-amber-600 text-xs font-semibold">
          발견된 이슈
        </span>
      ),
    },
    {
      icon: GitMerge,
      value: `${overview.mergeRate}%`,
      label: "머지율",
      badge: (
        <span className="text-emerald-600 text-xs font-semibold flex items-center gap-1">
          <MessageSquare className="w-3 h-3" />
          댓글 해결률 {commentResRate}%
        </span>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {cards.map((card, i) => (
        <div
          key={i}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
        >
          <div className="flex items-start justify-between mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-linear-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
              <card.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-slate-900 text-3xl sm:text-4xl md:text-5xl font-bold leading-none">
              {card.value}
            </div>
            <div className="text-slate-500 text-sm font-medium">
              {card.label}
            </div>
            <div className="mt-3">{card.badge}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
