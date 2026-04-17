import { NextRequest } from "next/server"
import { GET } from "@/app/api/github/repos/route"
import { auth } from "@/lib/auth"
import { getAuthenticatedOctokit } from "@/lib/github"
import { prisma } from "@/lib/prisma"
import {
  buildAccessibleRepositoryWhere,
  isRepositoryMembershipMigrationError,
} from "@/lib/repository-access"

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

jest.mock("@/lib/repository-access", () => ({
  buildAccessibleRepositoryWhere: jest.fn(),
  isRepositoryMembershipMigrationError: jest.fn(() => false),
}))

const mockedAuth = auth as jest.Mock
const mockedGetAuthenticatedOctokit = getAuthenticatedOctokit as jest.Mock
const mockedFindMany = prisma.repository.findMany as jest.Mock
const mockedBuildAccessibleRepositoryWhere =
  buildAccessibleRepositoryWhere as jest.Mock
const mockedIsRepositoryMembershipMigrationError =
  isRepositoryMembershipMigrationError as jest.Mock

const makeRequest = () =>
  new NextRequest("http://localhost/api/github/repos?page=1")

describe("GET /api/github/repos", () => {
  afterEach(() => {
    jest.clearAllMocks()
    mockedIsRepositoryMembershipMigrationError.mockReturnValue(false)
  })

  it("returns repository list for authenticated users", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessibleRepositoryWhere.mockResolvedValue({ id: { in: ["db-repo-1"] } })
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
      {
        id: 1,
        name: "repo-a",
        fullName: "user/repo-a",
        language: "TypeScript",
        isConnected: true,
        repositoryId: "db-repo-1",
      },
      {
        id: 2,
        name: "repo-b",
        fullName: "user/repo-b",
        language: "Python",
        isConnected: false,
        repositoryId: undefined,
      },
    ])
    expect(body.pagination).toEqual({ page: 1, perPage: 20, hasNextPage: false })
    expect(mockedFindMany).toHaveBeenCalledWith({
      where: { id: { in: ["db-repo-1"] } },
      select: { githubId: true, id: true },
    })
  })

  it("returns 401 for anonymous users", async () => {
    mockedAuth.mockResolvedValue(null)

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
  })

  it("returns 500 on unexpected errors", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedGetAuthenticatedOctokit.mockRejectedValue(new Error("GitHub API error"))

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe("Internal server error")
  })
})
