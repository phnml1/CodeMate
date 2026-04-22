import { GET } from "@/app/api/pulls/[id]/files/route"
import { auth } from "@/lib/auth"
import { getOctokit } from "@/lib/github"
import { prisma } from "@/lib/prisma"
import { buildAccessiblePullRequestWhere } from "@/lib/repository-access"

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("@/lib/github", () => ({
  getOctokit: jest.fn(),
  isGitHubReconnectRequiredError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 401,
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    pullRequest: {
      findFirst: jest.fn(),
    },
  },
}))

jest.mock("@/lib/repository-access", () => ({
  buildAccessiblePullRequestWhere: jest.fn(),
}))

const mockedAuth = auth as jest.Mock
const mockedGetOctokit = getOctokit as jest.Mock
const mockedFindFirst = prisma.pullRequest.findFirst as jest.Mock
const mockedBuildAccessiblePullRequestWhere =
  buildAccessiblePullRequestWhere as jest.Mock

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
    patch: undefined,
  },
]

describe("GET /api/pulls/[id]/files", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("returns 401 for anonymous users", async () => {
    mockedAuth.mockResolvedValue(null)

    const response = await GET(createRequest(), createParams())
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
  })

  it("returns 404 when the PR does not exist", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessiblePullRequestWhere.mockResolvedValue({
      repoId: { in: ["repo-1"] },
    })
    mockedFindFirst.mockResolvedValue(null)

    const response = await GET(createRequest(), createParams())
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe("Pull request not found")
  })

  it("returns transformed file data", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessiblePullRequestWhere.mockResolvedValue({
      repoId: { in: ["repo-1"] },
    })
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

  it("normalizes missing patch values to null", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessiblePullRequestWhere.mockResolvedValue({
      repoId: { in: ["repo-1"] },
    })
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

  it("parses owner/repo from fullName", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessiblePullRequestWhere.mockResolvedValue({
      repoId: { in: ["repo-1"] },
    })
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

  it("returns 500 on unexpected errors", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessiblePullRequestWhere.mockRejectedValue(new Error("DB error"))

    const response = await GET(createRequest(), createParams())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe("Internal server error")
  })
})
