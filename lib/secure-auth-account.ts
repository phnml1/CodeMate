import { storeGithubAccessToken } from "@/lib/github-token-store"

type OAuthAccountWithToken = {
  provider: string
  userId: string
  access_token?: string
  refresh_token?: string
}

export async function linkAccountWithoutPersistingGithubToken<
  T extends OAuthAccountWithToken,
>(
  account: T,
  linkAccount: (safeAccount: T) => Promise<unknown>,
  tokenStore = storeGithubAccessToken
): Promise<void> {
  const accessToken = account.provider === "github"
    ? account.access_token
    : undefined
  const safeAccount = { ...account }
  if (account.provider === "github") {
    delete safeAccount.access_token
    delete safeAccount.refresh_token
  }

  await linkAccount(safeAccount)
  if (accessToken) {
    await tokenStore(account.userId, accessToken)
  }
}
