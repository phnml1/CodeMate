import { linkAccountWithoutPersistingGithubToken } from "@/lib/secure-auth-account"

jest.mock("@/lib/github-token-store", () => ({
  storeGithubAccessToken: jest.fn(),
}))

it("removes GitHub token fields before the Auth.js account is linked", async () => {
  const linkAccount = jest.fn().mockResolvedValue(undefined)
  const tokenStore = jest.fn().mockResolvedValue(undefined)

  await linkAccountWithoutPersistingGithubToken(
    {
      provider: "github",
      userId: "user-1",
      providerAccountId: "github-1",
      access_token: "gho_secret",
      refresh_token: "ghr_secret",
    },
    linkAccount,
    tokenStore
  )

  expect(linkAccount).toHaveBeenCalledWith({
    provider: "github",
    userId: "user-1",
    providerAccountId: "github-1",
  })
  expect(tokenStore).toHaveBeenCalledWith("user-1", "gho_secret")
  expect(linkAccount.mock.invocationCallOrder[0]).toBeLessThan(
    tokenStore.mock.invocationCallOrder[0]
  )
})

it("does not strip tokens from non-GitHub providers", async () => {
  const linkAccount = jest.fn().mockResolvedValue(undefined)
  const tokenStore = jest.fn().mockResolvedValue(undefined)
  const account = {
    provider: "example",
    userId: "user-1",
    access_token: "provider-token",
  }

  await linkAccountWithoutPersistingGithubToken(account, linkAccount, tokenStore)

  expect(linkAccount).toHaveBeenCalledWith(account)
  expect(tokenStore).not.toHaveBeenCalled()
})

it("does not persist a GitHub refresh token when no access token is returned", async () => {
  const linkAccount = jest.fn().mockResolvedValue(undefined)
  const tokenStore = jest.fn().mockResolvedValue(undefined)

  await linkAccountWithoutPersistingGithubToken(
    {
      provider: "github",
      userId: "user-1",
      refresh_token: "ghr_secret",
    },
    linkAccount,
    tokenStore
  )

  expect(linkAccount).toHaveBeenCalledWith({
    provider: "github",
    userId: "user-1",
  })
  expect(tokenStore).not.toHaveBeenCalled()
})
