import { prisma } from "@/lib/prisma"

const READ_NOTIFICATION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  const cutoff = new Date(Date.now() - READ_NOTIFICATION_RETENTION_MS)
  const result = await prisma.notification.deleteMany({
    where: {
      isRead: true,
      readAt: { lte: cutoff },
    },
  })

  return Response.json({ deletedCount: result.count })
}
