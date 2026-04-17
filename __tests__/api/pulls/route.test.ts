import { GET } from "@/app/api/pulls/route"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildAccessiblePullRequestWhere } from "@/lib/repository-access"

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    pullRequest: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

jest.mock("@/lib/repository-access", () => ({
  buildAccessiblePullRequestWhere: jest.fn(),
}))

const mockedAuth = auth as jest.Mock
const mockedCount = prisma.pullRequest.count as jest.Mock
const mockedFindMany = prisma.pullRequest.findMany as jest.Mock
const mockedBuildAccessiblePullRequestWhere =
  buildAccessiblePullRequestWhere as jest.Mock

function createRequest(params?: Record<string, string>) {
  const url = new URL("http://localhost/api/pulls")
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  return new Request(url.toString())
}

const samplePR = {
  id: "pr-1",
  githubId: BigInt(1001),
  number: 45,
  title: "feat: Implement real-time monitoring",
  description: null,
  status: "OPEN",
  baseBranch: "main",
  headBranch: "feat/monitoring",
  additions: 142,
  deletions: 12,
  changedFiles: 5,
  repoId: "repo-1",
  repo: { id: "repo-1", name: "awesome-app", fullName: "user/awesome-app" },
  mergedAt: null,
  closedAt: null,
  githubCreatedAt: new Date().toISOString(),
  githubUpdatedAt: new Date().toISOString(),
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe("GET /api/pulls", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("returns 401 for anonymous users", async () => {
    mockedAuth.mockResolvedValue(null)

    const response = await GET(createRequest())
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
  })

  it("returns paginated pull requests", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessiblePullRequestWhere.mockResolvedValue({
      repoId: { in: ["repo-1"] },
    })
    mockedCount.mockResolvedValue(1)
    mockedFindMany.mockResolvedValue([samplePR])

    const response = await GET(createRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.pullRequests).toHaveLength(1)
    expect(body.pullRequests[0].title).toBe("feat: Implement real-time monitoring")
    expect(body.pullRequests[0].githubId).toBe(1001)
    expect(body.pagination).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 })
    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { repoId: { in: ["repo-1"] } },
        skip: 0,
        take: 20,
      })
    )
  })

  it("passes repoId into the accessibility filter", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessiblePullRequestWhere.mockResolvedValue({
      repoId: { in: ["repo-1"] },
    })
    mockedCount.mockResolvedValue(1)
    mockedFindMany.mockResolvedValue([samplePR])

    await GET(createRequest({ repoId: "repo-1" }))

    expect(mockedBuildAccessiblePullRequestWhere).toHaveBeenCalledWith(
      "user-1",
      "repo-1"
    )
  })

  it("applies status filters on top of accessible PR filters", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessiblePullRequestWhere.mockResolvedValue({
      repoId: { in: ["repo-1"] },
    })
    mockedCount.mockResolvedValue(1)
    mockedFindMany.mockResolvedValue([samplePR])

    await GET(createRequest({ status: "OPEN" }))

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { repoId: { in: ["repo-1"] }, status: "OPEN" },
      })
    )
  })

  it("returns 400 for invalid statuses", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })

    const response = await GET(createRequest({ status: "INVALID" }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain("Invalid status")
  })

  it("supports page and limit parameters", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessiblePullRequestWhere.mockResolvedValue({
      repoId: { in: ["repo-1"] },
    })
    mockedCount.mockResolvedValue(50)
    mockedFindMany.mockResolvedValue([])

    const response = await GET(createRequest({ page: "3", limit: "10" }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.pagination).toEqual({ total: 50, page: 3, limit: 10, totalPages: 5 })
    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 })
    )
  })

  it("caps limit at 50", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessiblePullRequestWhere.mockResolvedValue({
      repoId: { in: ["repo-1"] },
    })
    mockedCount.mockResolvedValue(0)
    mockedFindMany.mockResolvedValue([])

    await GET(createRequest({ limit: "100" }))

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 })
    )
  })

  it("returns 500 on unexpected errors", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessiblePullRequestWhere.mockRejectedValue(new Error("DB error"))

    const response = await GET(createRequest())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe("Internal server error")
  })
})
