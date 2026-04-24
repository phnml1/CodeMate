import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import StatsClient from "@/components/stats/StatsClient"
import { prisma } from "@/lib/prisma"
import { buildAccessibleRepositoryWhere } from "@/lib/repository-access"
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
  const session = await auth()
  if (!session?.user?.id) return null

  const repositoryWhere = await buildAccessibleRepositoryWhere(session.user.id)

  const [overviewResult, reposResult] = await Promise.allSettled([
    fetchStatsOverview(session.user.id, "30d"),
    prisma.repository.findMany({
      where: repositoryWhere,
      select: { id: true, name: true, fullName: true },
      orderBy: { name: "asc" },
    }),
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
