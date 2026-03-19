import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const DEFAULT_SETTINGS = {
  mentionEnabled: true,
  newReviewEnabled: true,
  prMergedEnabled: true,
  commentReplyEnabled: true,
}

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const setting = await prisma.notificationSetting.findUnique({
    where: { userId: session.user.id },
  })

  return Response.json({ settings: setting ?? DEFAULT_SETTINGS })
}

export async function PUT(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const {
    mentionEnabled,
    newReviewEnabled,
    prMergedEnabled,
    commentReplyEnabled,
  } = body as Record<string, boolean>

  const data = {
    mentionEnabled: mentionEnabled ?? true,
    newReviewEnabled: newReviewEnabled ?? true,
    prMergedEnabled: prMergedEnabled ?? true,
    commentReplyEnabled: commentReplyEnabled ?? true,
  }

  const setting = await prisma.notificationSetting.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: data,
  })

  return Response.json({ settings: setting })
}
