import { POST } from "@/app/api/repositories/[id]/sync/route"
import { auth } from "@/lib/auth"
import { getOctokit } from "@/lib/github"
import { prisma } from "@/lib/prisma"
import { syncRepositoryPullRequests } from "@/lib/pull-request-sync"
import { buildAccessibleRepositoryWhere } from "@/lib/repository-access"

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("@/lib/github", () => ({
  getOctokit: jest.fn(),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    repository: {
      findFirst: jest.fn(),
    },
  },
}))

jest.mock("@/lib/pull-request-sync", () => ({
  syncRepositoryPullRequests: jest.fn(),
}))

jest.mock("@/lib/repository-access", () => ({
  buildAccessibleRepositoryWhere: jest.fn(),
}))

const mockedAuth = auth as jest.Mock
const mockedGetOctokit = getOctokit as jest.Mock
const mockedFindFirst = prisma.repository.findFirst as jest.Mock
const mockedSyncRepositoryPullRequests = syncRepositoryPullRequests as jest.Mock
const mockedBuildAccessibleRepositoryWhere =
  buildAccessibleRepositoryWhere as jest.Mock

describe("POST /api/repositories/[id]/sync", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("returns 401 for anonymous users", async () => {
    mockedAuth.mockResolvedValue(null)

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "repo-1" }),
    })
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
  })

  it("syncs the latest PR list for the repository", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessibleRepositoryWhere.mockResolvedValue({ id: { in: ["repo-1"] } })
    mockedFindFirst.mockResolvedValue({
      id: "repo-1",
      fullName: "owner/sample-repo",
    })
    mockedGetOctokit.mockResolvedValue({ rest: { pulls: {} } })
    mockedSyncRepositoryPullRequests.mockResolvedValue({
      syncedCount: 18,
      detailHydratedCount: 4,
    })

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "repo-1" }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      updated: 18,
      total: 18,
      detailHydrated: 4,
    })
    expect(mockedBuildAccessibleRepositoryWhere).toHaveBeenCalledWith(
      "user-1",
      "repo-1"
    )
    expect(mockedSyncRepositoryPullRequests).toHaveBeenCalledWith({
      octokit: expect.any(Object),
      owner: "owner",
      repo: "sample-repo",
      repositoryId: "repo-1",
    })
  })

  it("returns 404 when the repository is not accessible", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessibleRepositoryWhere.mockResolvedValue({ id: { in: ["repo-1"] } })
    mockedFindFirst.mockResolvedValue(null)

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "repo-1" }),
    })
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe("Repository not found")
  })

  it("returns a reconnect message when the GitHub token is missing", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessibleRepositoryWhere.mockResolvedValue({ id: { in: ["repo-1"] } })
    mockedFindFirst.mockResolvedValue({
      id: "repo-1",
      fullName: "owner/sample-repo",
    })
    mockedGetOctokit.mockRejectedValue(
      new Error("GitHub 토큰이 없습니다. GitHub 계정을 다시 연결해 주세요.")
    )

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "repo-1" }),
    })
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toContain("GitHub")
    expect(body.error).toContain("다시 연결")
  })

  it("returns a permission message for GitHub 403 errors", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessibleRepositoryWhere.mockResolvedValue({ id: { in: ["repo-1"] } })
    mockedFindFirst.mockResolvedValue({
      id: "repo-1",
      fullName: "owner/sample-repo",
    })
    mockedGetOctokit.mockResolvedValue({ rest: { pulls: {} } })
    mockedSyncRepositoryPullRequests.mockRejectedValue({ status: 403 })

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "repo-1" }),
    })
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toContain("접근 권한")
  })
})
