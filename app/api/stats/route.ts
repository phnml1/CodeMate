import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import {
  fetchCodeChanges,
  fetchIssueDistribution,
  fetchPRTrend,
  fetchQualityTrend,
  fetchStatsOverview,
  isValidRange,
  VALID_TYPES,
  type StatsRange,
  type StatsType,
} from "@/lib/stats"

/**
 * @swagger
 * /api/stats:
 *   get:
 *     summary: Retrieve stats data
 *     description: Returns one stats payload at a time based on the `type` query parameter.
 *     tags:
 *       - Stats
 */
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const typeParam = searchParams.get("type") ?? "overview"
    const rangeParam = searchParams.get("range") ?? "30d"
    const repoId = searchParams.get("repoId") ?? undefined

    if (!VALID_TYPES.includes(typeParam as StatsType)) {
      return NextResponse.json(
        {
          error: `Invalid stats type. Supported values: ${VALID_TYPES.join(", ")}`,
        },
        { status: 400 }
      )
    }

    if (!isValidRange(rangeParam)) {
      return NextResponse.json(
        {
          error: "Invalid stats range. Supported values: 7d, 30d, 90d, all",
        },
        { status: 400 }
      )
    }

    const userId = session.user.id
    const range = rangeParam as StatsRange
    const type = typeParam as StatsType

    const handlers: Record<StatsType, () => Promise<unknown>> = {
      overview: () => fetchStatsOverview(userId, range, repoId),
      "pr-trend": async () => ({
        data: await fetchPRTrend(userId, range, repoId),
      }),
      "quality-trend": async () => ({
        data: await fetchQualityTrend(userId, range, repoId),
      }),
      "issue-distribution": () => fetchIssueDistribution(userId, range, repoId),
      "code-changes": async () => ({
        data: await fetchCodeChanges(userId, range, repoId),
      }),
    }

    return NextResponse.json(await handlers[type]())
  } catch (error) {
    console.error("[GET /api/stats]", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
