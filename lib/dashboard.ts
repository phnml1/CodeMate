import { prisma } from "@/lib/prisma"
import {
  fetchQualityTrend,
  fetchIssueDistribution,
  type QualityTrendItem,
  type IssueSeverityItem,
} from "@/lib/stats"

export type { QualityTrendItem, IssueSeverityItem }

export interface DashboardStats {
  avgQualityScore: number
  qualityScoreTrend: number // 이전 30일 대비 변화율 (%)
  openPRs: number
  pendingReviewPRs: number // 리뷰 없는 OPEN PR 수
  weeklyReviews: number
  weeklyReviewsDiff: number // 지난주 대비 차이
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
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function fetchDashboardStats(
  userId: string
): Promise<DashboardStats> {
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

  const repoFilter = { repo: { userId } }

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
        pullRequest: repoFilter,
        status: "COMPLETED",
        reviewedAt: { gte: thirtyDaysAgo },
      },
      _avg: { qualityScore: true },
    }),
    prisma.review.aggregate({
      where: {
        pullRequest: repoFilter,
        status: "COMPLETED",
        reviewedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
      _avg: { qualityScore: true },
    }),
    prisma.pullRequest.count({
      where: { ...repoFilter, status: "OPEN" },
    }),
    prisma.pullRequest.count({
      where: {
        ...repoFilter,
        status: "OPEN",
        reviews: { none: { status: "COMPLETED" } },
      },
    }),
    prisma.review.count({
      where: {
        pullRequest: repoFilter,
        status: "COMPLETED",
        reviewedAt: { gte: thisWeekStart },
      },
    }),
    prisma.review.count({
      where: {
        pullRequest: repoFilter,
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
  const dist = await fetchIssueDistribution(userId, "30d")
  return dist.bySeverity
}

export async function fetchDashboardRecentPRs(
  userId: string
): Promise<DashboardRecentPR[]> {
  const prs = await prisma.pullRequest.findMany({
    where: { repo: { userId } },
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

  return prs.map((pr) => ({
    id: pr.id,
    number: pr.number,
    title: pr.title,
    repoName: pr.repo.name,
    score: pr.reviews[0]?.qualityScore ?? null,
    status: pr.status as DashboardRecentPR["status"],
  }))
}
