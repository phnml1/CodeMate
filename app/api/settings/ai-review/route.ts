import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const DEFAULT_SETTINGS = {
  autoReview: true,
  language: "ko",
  severityLevel: "normal",
}

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const setting = await prisma.reviewSetting.findUnique({
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
  const { autoReview, language, severityLevel } = body as {
    autoReview?: boolean
    language?: string
    severityLevel?: string
  }

  const data = {
    autoReview: autoReview ?? true,
    language: language ?? "ko",
    severityLevel: severityLevel ?? "normal",
  }

  const setting = await prisma.reviewSetting.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: data,
  })

  return Response.json({ settings: setting })
}
