import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import {
  fetchQualityTrend,
  fetchIssueDistribution,
  type QualityTrendItem,
  type IssueSeverityItem,
} from "@/lib/stats"
import { getAccessibleRepositoryIds } from "@/lib/repository-access"

export type { QualityTrendItem, IssueSeverityItem }

export interface DashboardStats {
  avgQualityScore: number
  qualityScoreTrend: number
  openPRs: number
  pendingReviewPRs: number
  weeklyReviews: number
  weeklyReviewsDiff: number
}

export interface DashboardRecentPR {
  id: string
  number: number
  title: string
  repoName: string
  score: number | null
  status: "OPEN" | "MERGED" | "CLOSED" | "DRAFT"
}

function getWeekStart(date: Date): Date {
  const current = new Date(date)
  const day = current.getDay()
  const diff = current.getDate() - day + (day === 0 ? -6 : 1)
  current.setDate(diff)
  current.setHours(0, 0, 0, 0)
  return current
}

export async function fetchDashboardStats(
  userId: string
): Promise<DashboardStats> {
  const repoIds = await getAccessibleRepositoryIds(userId)
  const now = new Date()

  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(now.getDate() - 30)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  const sixtyDaysAgo = new Date(now)
  sixtyDaysAgo.setDate(now.getDate() - 60)
  sixtyDaysAgo.setHours(0, 0, 0, 0)

  const thisWeekStart = getWeekStart(now)
  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(thisWeekStart.getDate() - 7)

  const pullRequestFilter = {
    repoId: {
      in: repoIds,
    },
  }

  const [
    currentQuality,
    prevQuality,
    openPRs,
    pendingReviewPRs,
    weeklyReviews,
    prevWeekReviews,
  ] = await Promise.all([
    prisma.review.aggregate({
      where: {
        pullRequest: pullRequestFilter,
        status: "COMPLETED",
        reviewedAt: { gte: thirtyDaysAgo },
      },
      _avg: { qualityScore: true },
    }),
    prisma.review.aggregate({
      where: {
        pullRequest: pullRequestFilter,
        status: "COMPLETED",
        reviewedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
      _avg: { qualityScore: true },
    }),
    prisma.pullRequest.count({
      where: { ...pullRequestFilter, status: "OPEN" },
    }),
    prisma.pullRequest.count({
      where: {
        ...pullRequestFilter,
        status: "OPEN",
        reviews: { none: { status: "COMPLETED" } },
      },
    }),
    prisma.review.count({
      where: {
        pullRequest: pullRequestFilter,
        status: "COMPLETED",
        reviewedAt: { gte: thisWeekStart },
      },
    }),
    prisma.review.count({
      where: {
        pullRequest: pullRequestFilter,
        status: "COMPLETED",
        reviewedAt: { gte: lastWeekStart, lt: thisWeekStart },
      },
    }),
  ])

  const currentScore =
    Math.round((currentQuality._avg.qualityScore ?? 0) * 10) / 10
  const prevScore = prevQuality._avg.qualityScore

  const qualityScoreTrend =
    prevScore && prevScore > 0
      ? Math.round(((currentScore - prevScore) / prevScore) * 1000) / 10
      : 0

  return {
    avgQualityScore: currentScore,
    qualityScoreTrend,
    openPRs,
    pendingReviewPRs,
    weeklyReviews,
    weeklyReviewsDiff: weeklyReviews - prevWeekReviews,
  }
}

export async function fetchDashboardQualityTrend(
  userId: string
): Promise<QualityTrendItem[]> {
  return fetchQualityTrend(userId, "30d")
}

export async function fetchDashboardIssueSeverity(
  userId: string
): Promise<IssueSeverityItem[]> {
  const distribution = await fetchIssueDistribution(userId, "30d")
  return distribution.bySeverity
}

export async function fetchDashboardRecentPRs(
  userId: string
): Promise<DashboardRecentPR[]> {
  const repoIds = await getAccessibleRepositoryIds(userId)

  const pullRequests = await prisma.pullRequest.findMany({
    where: {
      repoId: {
        in: repoIds,
      },
    },
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      repo: { select: { name: true } },
      reviews: {
        where: { status: "COMPLETED" },
        select: { qualityScore: true },
        orderBy: { reviewedAt: "desc" },
        take: 1,
      },
    },
    orderBy: [
      { githubCreatedAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    take: 5,
  })

  return pullRequests.map((pullRequest) => ({
    id: pullRequest.id,
    number: pullRequest.number,
    title: pullRequest.title,
    repoName: pullRequest.repo.name,
    score: pullRequest.reviews[0]?.qualityScore ?? null,
    status: pullRequest.status as DashboardRecentPR["status"],
  }))
}

export const getCachedDashboardStats = (userId: string) =>
  unstable_cache(
    () => fetchDashboardStats(userId),
    ["dashboard-stats", userId],
    { revalidate: 3600, tags: ["dashboard", `dashboard-${userId}`] }
  )()

export const getCachedDashboardQualityTrend = (userId: string) =>
  unstable_cache(
    () => fetchDashboardQualityTrend(userId),
    ["dashboard-quality-trend", userId],
    { revalidate: 3600, tags: ["dashboard", `dashboard-${userId}`] }
  )()

export const getCachedDashboardIssueSeverity = (userId: string) =>
  unstable_cache(
    () => fetchDashboardIssueSeverity(userId),
    ["dashboard-issue-severity", userId],
    { revalidate: 3600, tags: ["dashboard", `dashboard-${userId}`] }
  )()

export const getCachedDashboardRecentPRs = (userId: string) =>
  unstable_cache(
    () => fetchDashboardRecentPRs(userId),
    ["dashboard-recent-prs", userId],
    { revalidate: 3600, tags: ["dashboard", `dashboard-${userId}`] }
  )()
