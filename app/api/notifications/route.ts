import { auth } from "@/lib/auth"
import {
  notificationCompatSelect,
  toBaseNotification,
} from "@/lib/notifications/compat"
import { prisma } from "@/lib/prisma"
import type { NotificationType } from "@/types/notification"

export async function GET(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const typeFilter = searchParams.get("type") as NotificationType | null
  const readFilter = searchParams.get("read") // "true" | "false" | null

  const where: Record<string, unknown> = { userId: session.user.id }

  if (typeFilter) {
    where.type = typeFilter
  }

  if (readFilter === "true") {
    where.isRead = true
  } else if (readFilter === "false") {
    where.isRead = false
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      select: notificationCompatSelect,
      orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
      take: 50,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { userId: session.user.id, isRead: false },
    }),
  ])

  // PR 상세 정보를 배치로 조회
  const prIds = [...new Set(notifications.map((n) => n.prId).filter(Boolean))] as string[]

  const prMap = new Map<string, { title: string; number: number; repoFullName: string }>()

  if (prIds.length > 0) {
    const prs = await prisma.pullRequest.findMany({
      where: { id: { in: prIds } },
      select: {
        id: true,
        title: true,
        number: true,
        repo: { select: { fullName: true } },
      },
    })
    for (const pr of prs) {
      prMap.set(pr.id, {
        title: pr.title,
        number: pr.number,
        repoFullName: pr.repo.fullName,
      })
    }
  }

  return Response.json({
    notifications: notifications.map((n) => {
      const pr = n.prId ? prMap.get(n.prId) : null
      return {
        ...toBaseNotification(n),
        prTitle: pr?.title ?? null,
        prNumber: pr?.number ?? null,
        repoFullName: pr?.repoFullName ?? null,
      }
    }),
    unreadCount,
    total,
  })
}
