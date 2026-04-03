import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import SettingsClient from "@/components/settings/SettingsClient"

export const metadata: Metadata = {
  title: "설정",
  description: "계정 정보 및 GitHub 연동을 관리하세요",
}

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const [user, account] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, image: true, githubId: true },
    }),
    prisma.account.findFirst({
      where: { userId: session.user.id, provider: "github" },
      select: { scope: true, providerAccountId: true },
    }),
  ])

  if (!user) redirect("/login")

  return (
    <SettingsClient
      user={{
        name: user.name,
        email: user.email,
        image: user.image,
        githubId: user.githubId !== null ? Number(user.githubId) : null,
      }}
      githubConnected={account !== null}
      githubScope={account?.scope ?? null}
    />
  )
}
