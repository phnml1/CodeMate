import { prisma } from "@/lib/prisma"
import { decryptGithubToken, encryptGithubToken } from "@/lib/github-token-crypto"

export async function storeGithubAccessToken(
  userId: string,
  accessToken: string
): Promise<void> {
  const encryptedToken = encryptGithubToken(accessToken)

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { githubToken: encryptedToken },
    })
    await tx.account.updateMany({
      where: { userId, provider: "github" },
      data: { access_token: null, refresh_token: null },
    })
  })
}

export async function revealGithubAccessTokenForUser(
  userId: string,
  storedValue: string
): Promise<string> {
  const result = decryptGithubToken(storedValue)
  if (result.needsMigration) {
    await storeGithubAccessToken(userId, result.token)
  }

  return result.token
}

export async function getGithubAccessToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { githubToken: true },
  })

  if (!user?.githubToken) return null
  return revealGithubAccessTokenForUser(userId, user.githubToken)
}
