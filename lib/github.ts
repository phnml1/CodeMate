import { Octokit } from "@octokit/rest"
import { auth } from "./auth"
import { getGithubAccessToken } from "./github-token-store"

export class GitHubReconnectRequiredError extends Error {
  constructor(message = "GitHub authorization expired. Please reconnect GitHub.") {
    super(message)
    this.name = "GitHubReconnectRequiredError"
  }
}

export function isGitHubReconnectRequiredError(error: unknown): boolean {
  if (error instanceof GitHubReconnectRequiredError) {
    return true
  }

  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 401
  )
}

/**
 * userId로 DB에서 githubToken을 조회하여 인증된 Octokit 인스턴스를 생성한다.
 */
export async function getOctokit(userId: string): Promise<Octokit> {
  const githubToken = await getGithubAccessToken(userId)

  if (!githubToken) {
    throw new GitHubReconnectRequiredError(
      "GitHub 토큰이 없습니다. GitHub 계정을 다시 연동해주세요."
    )
  }

  return new Octokit({ auth: githubToken })
}

/**
 * 현재 세션의 사용자로 인증된 Octokit 인스턴스를 생성한다.
 * Server Component / API Route / Server Action에서 사용.
 */
export async function getAuthenticatedOctokit(): Promise<Octokit> {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("인증되지 않은 사용자입니다. 로그인이 필요합니다.")
  }

  return getOctokit(session.user.id)
}
