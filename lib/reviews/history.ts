import "server-only"

import type { Prisma } from "@/lib/generated/prisma/client"
import type { AIReviewResponse } from "@/lib/ai/parsers"
import { prisma } from "@/lib/prisma"
import { buildAccessiblePullRequestWhere } from "@/lib/repository-access"
import type { Review, ReviewSeverity, ReviewStage, ReviewStatus } from "@/types/review"

export const REVIEW_HISTORY_PAGE_SIZE = 10

export type ReviewHistoryStatusFilter = ReviewStatus | "ALL"

export interface ReviewHistoryFilters {
  page: number
  query: string
  repoId?: string
  status: ReviewHistoryStatusFilter
}

export interface ReviewHistoryItem {
  id: string
  status: ReviewStatus
  stage: ReviewStage
  qualityScore: number
  severity: ReviewSeverity
  issueCount: number
  reviewedAt: string
  aiRequestedAt: string | null
  pullRequest: {
    id: string
    number: number
    title: string
    repo: {
      id: string
      name: string
      fullName: string
    }
  }
}

export interface ReviewHistoryResult {
  items: ReviewHistoryItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  hasActiveReview: boolean
}

export interface ReviewHistoryStats {
  completedCount: number
  issueCount: number
  averageQualityScore: number
  activeCount: number
}

export interface ReviewHistoryDetail extends Review {
  pullRequest: {
    id: string
    number: number
    title: string
    repo: {
      id: string
      name: string
      fullName: string
    }
  }
}

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export function parseReviewHistoryFilters(
  searchParams: Record<string, string | string[] | undefined>
): ReviewHistoryFilters {
  const rawPage = Number(firstSearchParam(searchParams.page) ?? "1")
  const rawStatus = firstSearchParam(searchParams.status)
  const allowedStatuses: ReviewHistoryStatusFilter[] = [
    "ALL",
    "PENDING",
    "IN_PROGRESS",
    "COMPLETED",
    "FAILED",
  ]

  return {
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    query: (firstSearchParam(searchParams.q) ?? "").trim().slice(0, 100),
    repoId: firstSearchParam(searchParams.repoId) || undefined,
    status: allowedStatuses.includes(rawStatus as ReviewHistoryStatusFilter)
      ? (rawStatus as ReviewHistoryStatusFilter)
      : "ALL",
  }
}

function withSearch(
  pullRequestWhere: Prisma.PullRequestWhereInput,
  query: string
): Prisma.PullRequestWhereInput {
  if (!query) return pullRequestWhere

  const number = /^#?\d+$/.test(query)
    ? Number(query.replace(/^#/, ""))
    : null

  return {
    ...pullRequestWhere,
    OR: [
      { title: { contains: query, mode: "insensitive" } },
      { repo: { name: { contains: query, mode: "insensitive" } } },
      ...(number !== null ? [{ number }] : []),
    ],
  }
}

export async function getReviewHistory(
  userId: string,
  filters: ReviewHistoryFilters
): Promise<ReviewHistoryResult> {
  const accessiblePullRequests = await buildAccessiblePullRequestWhere(
    userId,
    filters.repoId
  )
  const where: Prisma.ReviewWhereInput = {
    pullRequest: {
      is: withSearch(accessiblePullRequests, filters.query),
    },
    ...(filters.status !== "ALL" ? { status: filters.status } : {}),
  }

  const [reviews, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      select: {
        id: true,
        status: true,
        stage: true,
        qualityScore: true,
        severity: true,
        issueCount: true,
        reviewedAt: true,
        aiRequestedAt: true,
        pullRequest: {
          select: {
            id: true,
            number: true,
            title: true,
            repo: {
              select: { id: true, name: true, fullName: true },
            },
          },
        },
      },
      orderBy: { reviewedAt: "desc" },
      skip: (filters.page - 1) * REVIEW_HISTORY_PAGE_SIZE,
      take: REVIEW_HISTORY_PAGE_SIZE,
    }),
    prisma.review.count({ where }),
  ])

  return {
    items: reviews.map((review) => ({
      ...review,
      reviewedAt: review.reviewedAt.toISOString(),
      aiRequestedAt: review.aiRequestedAt?.toISOString() ?? null,
    })),
    pagination: {
      page: filters.page,
      pageSize: REVIEW_HISTORY_PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / REVIEW_HISTORY_PAGE_SIZE),
    },
    hasActiveReview: reviews.some(
      (review) => review.status === "PENDING" || review.status === "IN_PROGRESS"
    ),
  }
}

export async function getReviewHistoryStats(
  userId: string
): Promise<ReviewHistoryStats> {
  const accessiblePullRequests = await buildAccessiblePullRequestWhere(userId)
  const accessibleReviews: Prisma.ReviewWhereInput = {
    pullRequest: { is: accessiblePullRequests },
  }

  const [completedCount, completedAggregate, activeCount] =
    await prisma.$transaction([
      prisma.review.count({
        where: { ...accessibleReviews, status: "COMPLETED" },
      }),
      prisma.review.aggregate({
        where: { ...accessibleReviews, status: "COMPLETED" },
        _sum: { issueCount: true },
        _avg: { qualityScore: true },
      }),
      prisma.review.count({
        where: {
          ...accessibleReviews,
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
      }),
    ])

  return {
    completedCount,
    issueCount: completedAggregate._sum.issueCount ?? 0,
    averageQualityScore:
      Math.round((completedAggregate._avg.qualityScore ?? 0) * 10) / 10,
    activeCount,
  }
}

export async function getReviewHistoryDetail(
  userId: string,
  reviewId: string
): Promise<ReviewHistoryDetail | null> {
  const accessiblePullRequests = await buildAccessiblePullRequestWhere(userId)
  const review = await prisma.review.findFirst({
    where: {
      id: reviewId,
      pullRequest: { is: accessiblePullRequests },
    },
    select: {
      id: true,
      pullRequestId: true,
      aiSuggestions: true,
      qualityScore: true,
      severity: true,
      issueCount: true,
      status: true,
      stage: true,
      failureReason: true,
      aiRequestedAt: true,
      reviewedAt: true,
      pullRequest: {
        select: {
          id: true,
          number: true,
          title: true,
          repo: {
            select: { id: true, name: true, fullName: true },
          },
        },
      },
    },
  })

  if (!review) return null

  return {
    ...review,
    aiSuggestions: review.aiSuggestions as AIReviewResponse,
    reviewedAt: review.reviewedAt.toISOString(),
    aiRequestedAt: review.aiRequestedAt?.toISOString() ?? null,
  }
}
