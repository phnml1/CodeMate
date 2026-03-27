import { prisma } from "@/lib/prisma"
import type { AIReviewIssue } from "@/lib/ai/parsers"

export type StatsRange = "7d" | "30d" | "90d" | "all"
export type StatsType =
  | "overview"
  | "pr-trend"
  | "quality-trend"
  | "issue-distribution"
  | "code-changes"

export interface StatsOverview {
  totalPRs: number
  mergedPRs: number
  mergeRate: number
  avgQualityScore: number
  totalIssues: number
  resolvedComments: number
  totalComments: number
}

export interface PRTrendItem {
  week: string
  open: number
  merged: number
  closed: number
  draft: number
}

export interface QualityTrendItem {
  date: string
  avgScore: number
  reviewCount: number
}

export interface IssueSeverityItem {
  name: string
  value: number
  color: string
}

export interface IssueCategoryItem {
  name: string
  count: number
}

export interface IssueDistribution {
  bySeverity: IssueSeverityItem[]
  byCategory: IssueCategoryItem[]
}

export interface CodeChangesItem {
  week: string
  additions: number
  deletions: number
  files: number
}

export const VALID_RANGES = ["7d", "30d", "90d", "all"] as const
export const VALID_TYPES: StatsType[] = [
  "overview",
  "pr-trend",
  "quality-trend",
  "issue-distribution",
  "code-changes",
]

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#7c3aed",
  HIGH: "#ef4444",
  MEDIUM: "#f59e0b",
  LOW: "#3b82f6",
}

const ISSUE_CATEGORIES = [
  "BUG",
  "PERFORMANCE",
  "SECURITY",
  "QUALITY",
  "BEST_PRACTICE",
] as const

export function isValidRange(range: string): range is StatsRange {
  return VALID_RANGES.includes(range as StatsRange)
}

function getStartDate(range: StatsRange): Date | undefined {
  if (range === "all") return undefined
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d
}

// 해당 날짜가 속한 주의 월요일을 반환
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatWeekLabel(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function formatDayLabel(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export async function fetchStatsOverview(
  userId: string,
  range: StatsRange,
  repoId?: string
): Promise<StatsOverview> {
  const startDate = getStartDate(range)

  const prDateFilter = startDate
    ? { githubCreatedAt: { gte: startDate } }
    : {}
  const reviewDateFilter = startDate
    ? { reviewedAt: { gte: startDate } }
    : {}
  const commentDateFilter = startDate
    ? { createdAt: { gte: startDate } }
    : {}

  const prRepoFilter = {
    repo: { userId, ...(repoId ? { id: repoId } : {}) },
  }

  const [prStats, reviewAgg, issueAgg, totalComments, resolvedComments] =
    await Promise.all([
      prisma.pullRequest.groupBy({
        by: ["status"],
        where: { ...prRepoFilter, ...prDateFilter },
        _count: { id: true },
      }),
      prisma.review.aggregate({
        where: {
          pullRequest: prRepoFilter,
          status: "COMPLETED",
          ...reviewDateFilter,
        },
        _avg: { qualityScore: true },
      }),
      prisma.review.aggregate({
        where: {
          pullRequest: prRepoFilter,
          status: "COMPLETED",
          ...reviewDateFilter,
        },
        _sum: { issueCount: true },
      }),
      prisma.comment.count({
        where: { pullRequest: prRepoFilter, ...commentDateFilter },
      }),
      prisma.comment.count({
        where: {
          pullRequest: prRepoFilter,
          isResolved: true,
          ...commentDateFilter,
        },
      }),
    ])

  const totalPRs = prStats.reduce((sum, s) => sum + s._count.id, 0)
  const mergedPRs =
    prStats.find((s) => s.status === "MERGED")?._count.id ?? 0
  const mergeRate =
    totalPRs > 0 ? Math.round((mergedPRs / totalPRs) * 1000) / 10 : 0

  return {
    totalPRs,
    mergedPRs,
    mergeRate,
    avgQualityScore:
      Math.round((reviewAgg._avg.qualityScore ?? 0) * 10) / 10,
    totalIssues: issueAgg._sum.issueCount ?? 0,
    resolvedComments,
    totalComments,
  }
}

export async function fetchPRTrend(
  userId: string,
  range: StatsRange,
  repoId?: string
): Promise<PRTrendItem[]> {
  const startDate = getStartDate(range)

  const prs = await prisma.pullRequest.findMany({
    where: {
      repo: { userId, ...(repoId ? { id: repoId } : {}) },
      ...(startDate ? { githubCreatedAt: { gte: startDate } } : {}),
    },
    select: { status: true, githubCreatedAt: true, createdAt: true },
    orderBy: { githubCreatedAt: { sort: "asc", nulls: "last" } },
  })

  const weekMap = new Map<string, PRTrendItem>()

  for (const pr of prs) {
    const date = pr.githubCreatedAt ?? pr.createdAt
    const weekStart = getWeekStart(date)
    const key = weekStart.toISOString()

    if (!weekMap.has(key)) {
      weekMap.set(key, {
        week: formatWeekLabel(weekStart),
        open: 0,
        merged: 0,
        closed: 0,
        draft: 0,
      })
    }

    const entry = weekMap.get(key)!
    if (pr.status === "OPEN") entry.open++
    else if (pr.status === "MERGED") entry.merged++
    else if (pr.status === "CLOSED") entry.closed++
    else if (pr.status === "DRAFT") entry.draft++
  }

  return Array.from(weekMap.values())
}

export async function fetchQualityTrend(
  userId: string,
  range: StatsRange,
  repoId?: string
): Promise<QualityTrendItem[]> {
  const startDate = getStartDate(range)

  const reviews = await prisma.review.findMany({
    where: {
      pullRequest: {
        repo: { userId, ...(repoId ? { id: repoId } : {}) },
      },
      status: "COMPLETED",
      ...(startDate ? { reviewedAt: { gte: startDate } } : {}),
    },
    select: { qualityScore: true, reviewedAt: true },
    orderBy: { reviewedAt: "asc" },
  })

  const dayMap = new Map<string, { total: number; count: number }>()

  for (const r of reviews) {
    const d = new Date(r.reviewedAt)
    d.setHours(0, 0, 0, 0)
    const key = d.toISOString()

    if (!dayMap.has(key)) dayMap.set(key, { total: 0, count: 0 })
    const entry = dayMap.get(key)!
    entry.total += r.qualityScore
    entry.count++
  }

  return Array.from(dayMap.entries()).map(([key, val]) => ({
    date: formatDayLabel(new Date(key)),
    avgScore: Math.round((val.total / val.count) * 10) / 10,
    reviewCount: val.count,
  }))
}

export async function fetchIssueDistribution(
  userId: string,
  range: StatsRange,
  repoId?: string
): Promise<IssueDistribution> {
  const startDate = getStartDate(range)

  const reviewFilter = {
    pullRequest: {
      repo: { userId, ...(repoId ? { id: repoId } : {}) },
    },
    status: "COMPLETED" as const,
    ...(startDate ? { reviewedAt: { gte: startDate } } : {}),
  }

  const [severityGroups, reviews] = await Promise.all([
    prisma.review.groupBy({
      by: ["severity"],
      where: reviewFilter,
      _count: { id: true },
    }),
    prisma.review.findMany({
      where: reviewFilter,
      select: { aiSuggestions: true },
    }),
  ])

  const severityOrder = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
  const bySeverity: IssueSeverityItem[] = severityOrder
    .map((name) => ({
      name,
      value:
        severityGroups.find((g) => g.severity === name)?._count.id ?? 0,
      color: SEVERITY_COLORS[name],
    }))
    .filter((item) => item.value > 0)

  // aiSuggestions JSON에서 카테고리별 이슈 수 집계
  const categoryCount = new Map<string, number>()

  for (const r of reviews) {
    const suggestions = r.aiSuggestions as { issues?: AIReviewIssue[] }
    if (!suggestions?.issues) continue
    for (const issue of suggestions.issues) {
      const cat = issue.category
      if ((ISSUE_CATEGORIES as readonly string[]).includes(cat)) {
        categoryCount.set(cat, (categoryCount.get(cat) ?? 0) + 1)
      }
    }
  }

  const byCategory: IssueCategoryItem[] = ISSUE_CATEGORIES.map((name) => ({
    name,
    count: categoryCount.get(name) ?? 0,
  })).filter((item) => item.count > 0)

  return { bySeverity, byCategory }
}

export async function fetchCodeChanges(
  userId: string,
  range: StatsRange,
  repoId?: string
): Promise<CodeChangesItem[]> {
  const startDate = getStartDate(range)

  const prs = await prisma.pullRequest.findMany({
    where: {
      repo: { userId, ...(repoId ? { id: repoId } : {}) },
      ...(startDate ? { githubCreatedAt: { gte: startDate } } : {}),
    },
    select: {
      additions: true,
      deletions: true,
      changedFiles: true,
      githubCreatedAt: true,
      createdAt: true,
    },
    orderBy: { githubCreatedAt: { sort: "asc", nulls: "last" } },
  })

  const weekMap = new Map<string, CodeChangesItem>()

  for (const pr of prs) {
    const date = pr.githubCreatedAt ?? pr.createdAt
    const weekStart = getWeekStart(date)
    const key = weekStart.toISOString()

    if (!weekMap.has(key)) {
      weekMap.set(key, {
        week: formatWeekLabel(weekStart),
        additions: 0,
        deletions: 0,
        files: 0,
      })
    }

    const entry = weekMap.get(key)!
    entry.additions += pr.additions
    entry.deletions += pr.deletions
    entry.files += pr.changedFiles
  }

  return Array.from(weekMap.values())
}
