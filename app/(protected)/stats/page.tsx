import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { fetchStatsOverview } from "@/lib/stats"
import StatsClient from "@/components/stats/StatsClient"

export const metadata: Metadata = {
  title: "코드 통계",
  description: "코드 품질 지표 및 리뷰 통계를 분석하세요",
}

export default async function StatsPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const [overview, repos] = await Promise.all([
    fetchStatsOverview(session.user.id, "30d"),
    prisma.repository.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true, fullName: true },
      orderBy: { name: "asc" },
    }),
  ])

  return <StatsClient initialOverview={overview} repos={repos} />
}
