import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import {
  isValidRange,
  fetchStatsOverview,
  fetchPRTrend,
  fetchQualityTrend,
  fetchIssueDistribution,
  fetchCodeChanges,
  VALID_TYPES,
  type StatsRange,
  type StatsType,
} from "@/lib/stats"

/**
 * @swagger
 * /api/stats:
 *   get:
 *     summary: 통계 데이터 조회
 *     description: PR / 코드 품질 / 이슈 등 통계 데이터를 반환합니다. type 파라미터로 조회 유형을 선택합니다.
 *     tags:
 *       - Stats
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [overview, pr-trend, quality-trend, issue-distribution, code-changes]
 *           default: overview
 *         description: 조회할 통계 유형
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, all]
 *           default: 30d
 *         description: 조회 기간
 *       - in: query
 *         name: repoId
 *         schema:
 *           type: string
 *         description: 특정 저장소 ID로 필터링 (없으면 전체 저장소 합산)
 *     responses:
 *       200:
 *         description: 통계 데이터 조회 성공
 *       400:
 *         description: 유효하지 않은 파라미터
 *       401:
 *         description: 인증되지 않은 사용자
 *       500:
 *         description: 서버 내부 오류
 */
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") ?? "overview"
    const rangeParam = searchParams.get("range") ?? "30d"
    const repoId = searchParams.get("repoId") ?? undefined

    if (!VALID_TYPES.includes(type as StatsType)) {
      return NextResponse.json(
        {
          error: `유효하지 않은 type 값입니다. 허용값: ${VALID_TYPES.join(", ")}`,
        },
        { status: 400 }
      )
    }

    if (!isValidRange(rangeParam)) {
      return NextResponse.json(
        { error: "유효하지 않은 range 값입니다. 허용값: 7d, 30d, 90d, all" },
        { status: 400 }
      )
    }

    const range = rangeParam as StatsRange
    const userId = session.user.id

    switch (type as StatsType) {
      case "overview":
        return NextResponse.json(
          await fetchStatsOverview(userId, range, repoId)
        )
      case "pr-trend":
        return NextResponse.json({
          data: await fetchPRTrend(userId, range, repoId),
        })
      case "quality-trend":
        return NextResponse.json({
          data: await fetchQualityTrend(userId, range, repoId),
        })
      case "issue-distribution":
        return NextResponse.json(
          await fetchIssueDistribution(userId, range, repoId)
        )
      case "code-changes":
        return NextResponse.json({
          data: await fetchCodeChanges(userId, range, repoId),
        })
    }
  } catch (err) {
    console.error("[GET /api/stats]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
