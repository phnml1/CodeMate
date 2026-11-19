import { inspectGithubTokenForMigration } from "../lib/github-token-crypto"
import { storeGithubAccessToken } from "../lib/github-token-store"
import { prisma } from "../lib/prisma"

async function main() {
  const apply = process.argv.includes("--apply")
  const [users, accounts] = await Promise.all([
    prisma.user.findMany({
      where: { githubToken: { not: null } },
      select: { id: true, githubToken: true },
    }),
    prisma.account.findMany({
      where: { provider: "github", access_token: { not: null } },
      select: { userId: true, access_token: true },
    }),
  ])

  const storedByUser = new Map(users.map((user) => [user.id, user.githubToken]))
  for (const account of accounts) {
    if (!storedByUser.has(account.userId)) {
      storedByUser.set(account.userId, account.access_token)
    }
  }

  let encrypted = 0
  let pending = 0
  let migrated = 0

  for (const [userId, storedValue] of storedByUser) {
    if (!storedValue) continue
    const hasAccountCopy = accounts.some((account) => account.userId === userId)
    const result = inspectGithubTokenForMigration(storedValue, hasAccountCopy)
    if (!result.needsMigration) {
      encrypted += 1
      continue
    }

    pending += 1
    if (apply) {
      await storeGithubAccessToken(userId, result.token)
      migrated += 1
    }
  }

  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", encrypted, pending, migrated }))
  if (!apply && pending > 0) {
    console.log("No database rows were changed. Re-run with --apply after backup and review.")
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "GitHub token migration failed")
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
