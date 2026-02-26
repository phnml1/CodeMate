import { GET } from "@/app/api/pulls/[id]/route"
import { auth } from "@/lib/auth"
import { getOctokit } from "@/lib/github"
import { prisma } from "@/lib/prisma"

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("@/lib/github", () => ({
  getOctokit: jest.fn(),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    pullRequest: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}))

const mockedAuth = auth as jest.Mock
const mockedGetOctokit = getOctokit as jest.Mock
const mockedFindFirst = prisma.pullRequest.findFirst as jest.Mock
const mockedUpdate = prisma.pullRequest.update as jest.Mock

const createRequest = () => new Request("http://localhost/api/pulls/pr-1")
const createParams = (id = "pr-1") =>
  ({ params: Promise.resolve({ id }) }) as { params: Promise<{ id: string }> }

const samplePR = {
  id: "pr-1",
  githubId: BigInt(1001),
  number: 45,
  title: "feat: Add dashboard",
  description: null,
  status: "OPEN",
  baseBranch: "main",
  headBranch: "feat/dashboard",
  additions: 100,
  deletions: 20,
  changedFiles: 5,
  repoId: "repo-1",
  repo: { id: "repo-1", name: "awesome-app", fullName: "user/awesome-app" },
  reviews: [],
  mergedAt: null,
  closedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe("GET /api/pulls/[id]", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("미인증 사용자는 401을 반환한다", async () => {
    mockedAuth.mockResolvedValue(null)

    const response = await GET(createRequest(), createParams())
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
  })

  it("존재하지 않는 PR은 404를 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindFirst.mockResolvedValue(null)

    const response = await GET(createRequest(), createParams())
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe("PR을 찾을 수 없습니다.")
  })

  it("정상 조회 시 PR 상세를 반환하고 githubId를 Number로 직렬화한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindFirst.mockResolvedValue(samplePR)

    const response = await GET(createRequest(), createParams())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.id).toBe("pr-1")
    expect(body.githubId).toBe(1001)
    expect(body.additions).toBe(100)
    expect(body.deletions).toBe(20)
    expect(body.changedFiles).toBe(5)
    expect(body.reviews).toEqual([])
  })

  it("additions/deletions/changedFiles가 모두 0이면 GitHub API로 보정한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindFirst.mockResolvedValue({
      ...samplePR,
      additions: 0,
      deletions: 0,
      changedFiles: 0,
    })

    const mockOctokit = {
      pulls: {
        get: jest.fn().mockResolvedValue({
          data: { additions: 50, deletions: 10, changed_files: 3 },
        }),
      },
    }
    mockedGetOctokit.mockResolvedValue(mockOctokit)
    mockedUpdate.mockResolvedValue({})

    const response = await GET(createRequest(), createParams())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.additions).toBe(50)
    expect(body.deletions).toBe(10)
    expect(body.changedFiles).toBe(3)
    expect(mockOctokit.pulls.get).toHaveBeenCalledWith({
      owner: "user",
      repo: "awesome-app",
      pull_number: 45,
    })
  })

  it("GitHub API 보정 실패 시 0값 그대로 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindFirst.mockResolvedValue({
      ...samplePR,
      additions: 0,
      deletions: 0,
      changedFiles: 0,
    })
    mockedGetOctokit.mockRejectedValue(new Error("GitHub API error"))

    const response = await GET(createRequest(), createParams())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.additions).toBe(0)
    expect(body.deletions).toBe(0)
    expect(body.changedFiles).toBe(0)
  })

  it("서버 에러 시 500을 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindFirst.mockRejectedValue(new Error("DB error"))

    const response = await GET(createRequest(), createParams())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe("Internal server error")
  })
})
