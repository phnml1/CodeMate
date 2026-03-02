import { GET } from "@/app/api/pulls/[id]/files/route"
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
    },
  },
}))

const mockedAuth = auth as jest.Mock
const mockedGetOctokit = getOctokit as jest.Mock
const mockedFindFirst = prisma.pullRequest.findFirst as jest.Mock

const createRequest = () => new Request("http://localhost/api/pulls/pr-1/files")
const createParams = (id = "pr-1") =>
  ({ params: Promise.resolve({ id }) }) as { params: Promise<{ id: string }> }

const samplePR = {
  number: 45,
  repo: { fullName: "user/awesome-app" },
}

const sampleFiles = [
  {
    filename: "src/index.ts",
    status: "modified",
    additions: 10,
    deletions: 3,
    changes: 13,
    patch: "@@ -1,3 +1,10 @@\n+added line",
  },
  {
    filename: "src/new-file.ts",
    status: "added",
    additions: 20,
    deletions: 0,
    changes: 20,
    patch: "@@ -0,0 +1,20 @@\n+new file content",
  },
  {
    filename: "src/removed.ts",
    status: "removed",
    additions: 0,
    deletions: 5,
    changes: 5,
    patch: undefined, // patch가 없는 경우
  },
]

describe("GET /api/pulls/[id]/files", () => {
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

  it("정상 조회 시 파일 목록(filename, status, additions, deletions, changes, patch)을 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindFirst.mockResolvedValue(samplePR)

    const mockOctokit = {
      pulls: {
        listFiles: jest.fn().mockResolvedValue({ data: sampleFiles }),
      },
    }
    mockedGetOctokit.mockResolvedValue(mockOctokit)

    const response = await GET(createRequest(), createParams())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.files).toHaveLength(3)
    expect(body.files[0]).toEqual({
      filename: "src/index.ts",
      status: "modified",
      additions: 10,
      deletions: 3,
      changes: 13,
      patch: "@@ -1,3 +1,10 @@\n+added line",
    })
  })

  it("patch가 없는 파일은 null로 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindFirst.mockResolvedValue(samplePR)

    const mockOctokit = {
      pulls: {
        listFiles: jest.fn().mockResolvedValue({ data: sampleFiles }),
      },
    }
    mockedGetOctokit.mockResolvedValue(mockOctokit)

    const response = await GET(createRequest(), createParams())
    const body = await response.json()

    expect(body.files[2].patch).toBeNull()
  })

  it("owner/repo를 fullName에서 올바르게 파싱해 GitHub API를 호출한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindFirst.mockResolvedValue(samplePR)

    const mockListFiles = jest.fn().mockResolvedValue({ data: [] })
    mockedGetOctokit.mockResolvedValue({ pulls: { listFiles: mockListFiles } })

    await GET(createRequest(), createParams())

    expect(mockListFiles).toHaveBeenCalledWith({
      owner: "user",
      repo: "awesome-app",
      pull_number: 45,
      per_page: 100,
    })
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
