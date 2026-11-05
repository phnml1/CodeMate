import { auth } from "@/lib/auth"
import { notificationCompatSelect, toBaseNotification } from "@/lib/notifications/compat"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [unreadCount, recentNotifications] = await Promise.all([
    prisma.notification.count({
      where: { userId: session.user.id, isRead: false },
    }),
    prisma.notification.findMany({
      where: { userId: session.user.id, isRead: false },
      select: notificationCompatSelect,
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ])

  return Response.json({
    unreadCount,
    recentNotifications: recentNotifications.map((notification) =>
      toBaseNotification(notification)
    ),
  })
}
