import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { fetchStatsOverview } from "@/lib/stats"
import StatsClient from "@/components/stats/StatsClient"

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
