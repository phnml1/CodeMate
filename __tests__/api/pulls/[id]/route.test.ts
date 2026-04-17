import { GET } from "@/app/api/pulls/[id]/route"
import { auth } from "@/lib/auth"
import { getOctokit } from "@/lib/github"
import { prisma } from "@/lib/prisma"
import {
  buildAccessiblePullRequestWhere,
  getRepositoryPrimaryUser,
} from "@/lib/repository-access"

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

jest.mock("@/lib/repository-access", () => ({
  buildAccessiblePullRequestWhere: jest.fn(),
  getRepositoryPrimaryUser: jest.fn(),
}))

const mockedAuth = auth as jest.Mock
const mockedGetOctokit = getOctokit as jest.Mock
const mockedFindFirst = prisma.pullRequest.findFirst as jest.Mock
const mockedUpdate = prisma.pullRequest.update as jest.Mock
const mockedBuildAccessiblePullRequestWhere =
  buildAccessiblePullRequestWhere as jest.Mock
const mockedGetRepositoryPrimaryUser = getRepositoryPrimaryUser as jest.Mock

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

  it("serializes githubId and returns repository owner info", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessiblePullRequestWhere.mockResolvedValue({
      repoId: { in: ["repo-1"] },
    })
    mockedGetRepositoryPrimaryUser.mockResolvedValue({
      id: "user-1",
      name: "Owner",
      image: null,
      githubToken: "token",
    })
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
    expect(body.repo.owner).toEqual(
      expect.objectContaining({ id: "user-1", name: "Owner" })
    )
  })

  it("hydrates code change counts from GitHub when stored values are zero", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessiblePullRequestWhere.mockResolvedValue({
      repoId: { in: ["repo-1"] },
    })
    mockedGetRepositoryPrimaryUser.mockResolvedValue(null)
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

  it("keeps zero values when GitHub hydration fails", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessiblePullRequestWhere.mockResolvedValue({
      repoId: { in: ["repo-1"] },
    })
    mockedGetRepositoryPrimaryUser.mockResolvedValue(null)
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

  it("returns 500 on unexpected errors", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessiblePullRequestWhere.mockRejectedValue(new Error("DB error"))

    const response = await GET(createRequest(), createParams())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe("Internal server error")
  })
})
