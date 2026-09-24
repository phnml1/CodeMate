import type { Metadata } from "next"
import StatsClient from "@/components/stats/StatsClient"
import { getConnectedRepositoriesForUser } from "@/lib/dal/repositories"
import { requireCurrentUser } from "@/lib/dal/session"
import { fetchStatsOverview, type StatsOverview } from "@/lib/stats"

export const metadata: Metadata = {
  title: "Code Stats",
  description: "Analyze quality trends, review insights, and pull request activity.",
}

const EMPTY_OVERVIEW: StatsOverview = {
  totalPRs: 0,
  mergedPRs: 0,
  mergeRate: 0,
  avgQualityScore: 0,
  totalIssues: 0,
  resolvedComments: 0,
  totalComments: 0,
}

export default async function StatsPage() {
  const user = await requireCurrentUser()

  const [overviewResult, reposResult] = await Promise.allSettled([
    fetchStatsOverview(user.id, "30d"),
    getConnectedRepositoriesForUser(user.id),
  ])

  const initialOverview =
    overviewResult.status === "fulfilled"
      ? overviewResult.value
      : EMPTY_OVERVIEW

  const initialOverviewError =
    overviewResult.status === "rejected"
      ? "Failed to load overview metrics on the first render."
      : null

  const repos = reposResult.status === "fulfilled" ? reposResult.value : []

  return (
    <StatsClient
      initialOverview={initialOverview}
      initialOverviewError={initialOverviewError}
      repos={repos}
    />
  )
}
