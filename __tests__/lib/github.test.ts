import { Octokit } from "@octokit/rest"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getOctokit, getAuthenticatedOctokit } from "@/lib/github"

const mockOctokitInstance = { rest: {} }

jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn(() => mockOctokitInstance),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

const mockedOctokit = jest.mocked(Octokit)
const mockedFindUnique = jest.mocked(prisma.user.findUnique)
const mockedAuth = jest.mocked(auth)

describe("getOctokit", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("토큰이 존재하면 Octokit 인스턴스를 반환한다", async () => {
    mockedFindUnique.mockResolvedValue({
      githubToken: "gho_test_token_123",
    })

    const octokit = await getOctokit("user-1")

    expect(octokit).toBe(mockOctokitInstance)
    expect(mockedOctokit).toHaveBeenCalledWith({ auth: "gho_test_token_123" })
    expect(mockedFindUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { githubToken: true },
    })
  })

  it("토큰이 없으면 에러를 throw한다", async () => {
    mockedFindUnique.mockResolvedValue({ githubToken: null })

    await expect(getOctokit("user-1")).rejects.toThrow(
      "GitHub 토큰이 없습니다"
    )
  })

  it("유저가 존재하지 않으면 에러를 throw한다", async () => {
    mockedFindUnique.mockResolvedValue(null)

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
    mockedFindUnique.mockResolvedValue({
      githubToken: "gho_test_token_123",
    })

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
