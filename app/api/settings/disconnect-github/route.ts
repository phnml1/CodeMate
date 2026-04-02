import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE() {
  const session = await auth()

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { githubToken: null, githubId: null },
    }),
    prisma.account.deleteMany({
      where: { userId, provider: "github" },
    }),
  ])

  return Response.json({ ok: true })
}
