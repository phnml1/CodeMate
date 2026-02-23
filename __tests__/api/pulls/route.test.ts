import { GET } from "@/app/api/pulls/route"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

const mockedAuth = auth as jest.Mock
const mockedCount = prisma.pullRequest.count as jest.Mock
const mockedFindMany = prisma.pullRequest.findMany as jest.Mock

function createRequest(params?: Record<string, string>) {
  const url = new URL("http://localhost/api/pulls")
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  return new Request(url.toString())
}

const samplePR = {
  id: "pr-1",
  githubId: 1001,
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
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe("GET /api/pulls", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("미인증 사용자는 401을 반환한다", async () => {
    mockedAuth.mockResolvedValue(null)

    const response = await GET(createRequest())
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
  })

  it("기본 조회 시 pagination과 함께 PR 목록을 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedCount.mockResolvedValue(1)
    mockedFindMany.mockResolvedValue([samplePR])

    const response = await GET(createRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.pullRequests).toHaveLength(1)
    expect(body.pullRequests[0].title).toBe("feat: Implement real-time monitoring")
    expect(body.pagination).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 })
    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { repo: { userId: "user-1" } },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 20,
      })
    )
  })

  it("repoId 파라미터로 저장소 필터링이 동작한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedCount.mockResolvedValue(1)
    mockedFindMany.mockResolvedValue([samplePR])

    await GET(createRequest({ repoId: "repo-1" }))

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { repo: { userId: "user-1" }, repoId: "repo-1" },
      })
    )
  })

  it("status 파라미터로 상태 필터링이 동작한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedCount.mockResolvedValue(1)
    mockedFindMany.mockResolvedValue([samplePR])

    await GET(createRequest({ status: "OPEN" }))

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { repo: { userId: "user-1" }, status: "OPEN" },
      })
    )
  })

  it("유효하지 않은 status 값은 400을 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })

    const response = await GET(createRequest({ status: "INVALID" }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain("유효하지 않은")
  })

  it("page/limit 파라미터로 페이지네이션이 동작한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
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

  it("limit은 최대 50을 초과할 수 없다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedCount.mockResolvedValue(0)
    mockedFindMany.mockResolvedValue([])

    await GET(createRequest({ limit: "100" }))

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 })
    )
  })

  it("서버 에러 시 500을 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedCount.mockRejectedValue(new Error("DB error"))

    const response = await GET(createRequest())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe("Internal server error")
  })
})
