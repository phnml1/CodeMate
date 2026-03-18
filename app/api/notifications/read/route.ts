import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const ids: string[] | undefined = body.ids

  await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      isRead: false,
      ...(ids ? { id: { in: ids } } : {}),
    },
    data: { isRead: true },
  })

  return Response.json({ success: true })
}
