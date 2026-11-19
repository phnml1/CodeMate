import { randomBytes } from "node:crypto"
import { prisma } from "@/lib/prisma"
import {
  getGithubAccessToken,
  revealGithubAccessTokenForUser,
  storeGithubAccessToken,
} from "@/lib/github-token-store"
import { decryptGithubToken, isEncryptedGithubToken } from "@/lib/github-token-crypto"

const tx = {
  user: { update: jest.fn() },
  account: { updateMany: jest.fn() },
}

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}))

const mockedFindUnique = prisma.user.findUnique as jest.Mock
const mockedTransaction = prisma.$transaction as jest.Mock
const originalEnvironment = { ...process.env }

beforeEach(() => {
  jest.clearAllMocks()
  process.env.GITHUB_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64")
  mockedTransaction.mockImplementation(async (callback) => callback(tx))
})

afterEach(() => {
  process.env = { ...originalEnvironment }
})

it("stores only an encrypted token and clears Auth.js token copies", async () => {
  await storeGithubAccessToken("user-1", "gho_secret_token")

  const stored = tx.user.update.mock.calls[0][0].data.githubToken as string
  expect(isEncryptedGithubToken(stored)).toBe(true)
  expect(decryptGithubToken(stored).token).toBe("gho_secret_token")
  expect(tx.account.updateMany).toHaveBeenCalledWith({
    where: { userId: "user-1", provider: "github" },
    data: { access_token: null, refresh_token: null },
  })
})

it("migrates a legacy plaintext token when it is read", async () => {
  await expect(
    revealGithubAccessTokenForUser("user-1", "legacy-token")
  ).resolves.toBe("legacy-token")

  expect(mockedTransaction).toHaveBeenCalledTimes(1)
})

it("returns null when the user has no GitHub token", async () => {
  mockedFindUnique.mockResolvedValue({ githubToken: null })

  await expect(getGithubAccessToken("user-1")).resolves.toBeNull()
})
