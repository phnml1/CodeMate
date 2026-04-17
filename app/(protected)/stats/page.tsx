import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { fetchStatsOverview } from "@/lib/stats"
import { buildAccessibleRepositoryWhere } from "@/lib/repository-access"
import StatsClient from "@/components/stats/StatsClient"

export const metadata: Metadata = {
  title: "코드 통계",
  description: "코드 품질 지표와 리뷰 통계를 분석합니다.",
}

export default async function StatsPage() {
  const session = await auth()
  if (!session?.user?.id) return null
  const repositoryWhere = await buildAccessibleRepositoryWhere(session.user.id)

  const [overview, repos] = await Promise.all([
    fetchStatsOverview(session.user.id, "30d"),
    prisma.repository.findMany({
      where: repositoryWhere,
      select: { id: true, name: true, fullName: true },
      orderBy: { name: "asc" },
    }),
  ])

  return <StatsClient initialOverview={overview} repos={repos} />
}
