import { NextRequest } from "next/server"
import { GET } from "@/app/api/github/repos/route"
import { auth } from "@/lib/auth"
import { getAuthenticatedOctokit } from "@/lib/github"
import { prisma } from "@/lib/prisma"

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("@/lib/github", () => ({
  getAuthenticatedOctokit: jest.fn(),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    repository: {
      findMany: jest.fn(),
    },
  },
}))

const mockedAuth = auth as jest.Mock
const mockedGetAuthenticatedOctokit = getAuthenticatedOctokit as jest.Mock
const mockedFindMany = prisma.repository.findMany as jest.Mock

const makeRequest = () => new NextRequest("http://localhost/api/github/repos")

describe("GET /api/github/repos", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("인증된 사용자의 Repository 목록을 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedGetAuthenticatedOctokit.mockResolvedValue({
      rest: {
        repos: {
          listForAuthenticatedUser: jest.fn().mockResolvedValue({
            data: [
              { id: 1, name: "repo-a", full_name: "user/repo-a", language: "TypeScript" },
              { id: 2, name: "repo-b", full_name: "user/repo-b", language: "Python" },
            ],
            headers: {},
          }),
        },
      },
    })
    mockedFindMany.mockResolvedValue([{ githubId: BigInt(1), id: "db-repo-1" }])

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.repos).toEqual([
      { id: 1, name: "repo-a", fullName: "user/repo-a", language: "TypeScript", isConnected: true, repositoryId: "db-repo-1" },
      { id: 2, name: "repo-b", fullName: "user/repo-b", language: "Python", isConnected: false, repositoryId: undefined },
    ])
    expect(mockedFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { githubId: true, id: true },
    })
  })

  it("미인증 사용자는 401을 반환한다", async () => {
    mockedAuth.mockResolvedValue(null)

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
  })

  it("GitHub API 에러 시 500을 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedGetAuthenticatedOctokit.mockRejectedValue(new Error("GitHub API error"))

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe("Internal server error")
  })
})
