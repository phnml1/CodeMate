import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const notification = await prisma.notification.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  })

  if (!notification) {
    return Response.json({ error: "Notification not found" }, { status: 404 })
  }

  await prisma.notification.delete({
    where: { id },
    select: { id: true },
  })

  return Response.json({ success: true })
}
