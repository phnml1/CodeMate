import "server-only"

import { prisma } from "@/lib/prisma"
import { buildAccessibleRepositoryWhere } from "@/lib/repository-access"
import type { ConnectedRepository } from "@/types/repos"

export async function getConnectedRepositoriesForUser(
  userId: string
): Promise<ConnectedRepository[]> {
  const where = await buildAccessibleRepositoryWhere(userId)

  return prisma.repository.findMany({
    where,
    select: { id: true, name: true, fullName: true },
    orderBy: { name: "asc" },
  })
}
