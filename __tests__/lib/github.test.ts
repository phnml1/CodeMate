import { Octokit } from "@octokit/rest"
import { auth } from "@/lib/auth"
import { getOctokit, getAuthenticatedOctokit } from "@/lib/github"
import { getGithubAccessToken } from "@/lib/github-token-store"

const mockOctokitInstance = { rest: {} }

jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn(() => mockOctokitInstance),
}))

jest.mock("@/lib/github-token-store", () => ({
  getGithubAccessToken: jest.fn(),
}))

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

const mockedOctokit = jest.mocked(Octokit)
const mockedGetGithubAccessToken = getGithubAccessToken as jest.Mock
const mockedAuth = auth as jest.Mock

describe("getOctokit", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("토큰이 존재하면 Octokit 인스턴스를 반환한다", async () => {
    mockedGetGithubAccessToken.mockResolvedValue("gho_test_token_123")

    const octokit = await getOctokit("user-1")

    expect(octokit).toBe(mockOctokitInstance)
    expect(mockedOctokit).toHaveBeenCalledWith({ auth: "gho_test_token_123" })
    expect(mockedGetGithubAccessToken).toHaveBeenCalledWith("user-1")
  })

  it("토큰이 없으면 에러를 throw한다", async () => {
    mockedGetGithubAccessToken.mockResolvedValue(null)

    await expect(getOctokit("user-1")).rejects.toThrow(
      "GitHub 토큰이 없습니다"
    )
  })

  it("유저가 존재하지 않으면 에러를 throw한다", async () => {
    mockedGetGithubAccessToken.mockResolvedValue(null)

    await expect(getOctokit("nonexistent")).rejects.toThrow(
      "GitHub 토큰이 없습니다"
    )
  })
})

describe("getAuthenticatedOctokit", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("인증된 세션이 있으면 Octokit 인스턴스를 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedGetGithubAccessToken.mockResolvedValue("gho_test_token_123")

    const octokit = await getAuthenticatedOctokit()

    expect(octokit).toBe(mockOctokitInstance)
  })

  it("세션이 없으면 에러를 throw한다", async () => {
    mockedAuth.mockResolvedValue(null)

    await expect(getAuthenticatedOctokit()).rejects.toThrow(
      "인증되지 않은 사용자입니다"
    )
  })

  it("세션에 user.id가 없으면 에러를 throw한다", async () => {
    mockedAuth.mockResolvedValue({ user: {} })

    await expect(getAuthenticatedOctokit()).rejects.toThrow(
      "인증되지 않은 사용자입니다"
    )
  })
})
