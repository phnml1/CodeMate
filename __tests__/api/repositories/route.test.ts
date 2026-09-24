import { GET, POST } from "@/app/api/repositories/route"
import { auth } from "@/lib/auth"
import { getConnectedRepositoriesForUser } from "@/lib/dal/repositories"
import { invalidateDashboardForUsers } from "@/lib/dashboard-cache"
import { getOctokit } from "@/lib/github"
import { prisma } from "@/lib/prisma"
import { syncRepositoryPullRequests } from "@/lib/pull-request-sync"
import {
  connectRepositoryToUser,
  getRepositoryMemberIds,
  isRepositoryMembershipMigrationError,
} from "@/lib/repository-access"

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("@/lib/dal/repositories", () => ({
  getConnectedRepositoriesForUser: jest.fn(),
}))

jest.mock("@/lib/dashboard-cache", () => ({
  invalidateDashboardForUsers: jest.fn(),
}))

jest.mock("@/lib/github", () => ({
  getOctokit: jest.fn(),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    repository: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock("@/lib/pull-request-sync", () => ({
  syncRepositoryPullRequests: jest.fn(),
}))

jest.mock("@/lib/repository-access", () => ({
  connectRepositoryToUser: jest.fn(),
  getRepositoryMemberIds: jest.fn().mockResolvedValue(["user-1"]),
  isRepositoryMembershipMigrationError: jest.fn(() => false),
}))

const mockedAuth = auth as jest.Mock
const mockedGetConnectedRepositoriesForUser =
  getConnectedRepositoriesForUser as jest.Mock
const mockedGetOctokit = getOctokit as jest.Mock
const mockedFindUnique = prisma.repository.findUnique as jest.Mock
const mockedCreate = prisma.repository.create as jest.Mock
const mockedUpdate = prisma.repository.update as jest.Mock
const mockedSyncRepositoryPullRequests = syncRepositoryPullRequests as jest.Mock
const mockedConnectRepositoryToUser = connectRepositoryToUser as jest.Mock
const mockedGetRepositoryMemberIds = getRepositoryMemberIds as jest.Mock
const mockedIsRepositoryMembershipMigrationError =
  isRepositoryMembershipMigrationError as jest.Mock

function createRequest(body: object) {
  return new Request("http://localhost/api/repositories", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

describe("GET /api/repositories", () => {
  afterEach(() => {
    jest.clearAllMocks()
    mockedGetRepositoryMemberIds.mockResolvedValue(["user-1"])
    mockedIsRepositoryMembershipMigrationError.mockReturnValue(false)
  })

  it("returns 401 for anonymous users", async () => {
    mockedAuth.mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(401)
    expect(mockedGetConnectedRepositoriesForUser).not.toHaveBeenCalled()
  })

  it("uses the shared accessible repository lookup", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedGetConnectedRepositoriesForUser.mockResolvedValue([
      { id: "repo-1", name: "repo", fullName: "owner/repo" },
    ])

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      repositories: [{ id: "repo-1", name: "repo", fullName: "owner/repo" }],
    })
    expect(mockedGetConnectedRepositoriesForUser).toHaveBeenCalledWith("user-1")
  })

  it("preserves the migration error response", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedGetConnectedRepositoriesForUser.mockRejectedValue(
      new Error("membership table missing")
    )
    mockedIsRepositoryMembershipMigrationError.mockReturnValue(true)

    const response = await GET()

    expect(response.status).toBe(503)
  })
})

describe("POST /api/repositories", () => {
  afterEach(() => {
    jest.clearAllMocks()
    mockedGetRepositoryMemberIds.mockResolvedValue(["user-1"])
    mockedIsRepositoryMembershipMigrationError.mockReturnValue(false)
  })

  it("creates a repository connection", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindUnique.mockResolvedValue(null)
    mockedSyncRepositoryPullRequests.mockResolvedValue({
      syncedCount: 0,
      detailHydratedCount: 0,
    })
    mockedGetOctokit.mockResolvedValue({
      rest: {
        repos: {
          createWebhook: jest.fn().mockResolvedValue({ data: { id: 9999 } }),
        },
      },
    })
    mockedCreate.mockResolvedValue({
      id: "repo-1",
      githubId: BigInt(12345),
      name: "my-repo",
      fullName: "user/my-repo",
      description: null,
      language: "TypeScript",
      webhookId: null,
    })
    mockedUpdate.mockResolvedValue({
      id: "repo-1",
      githubId: BigInt(12345),
      name: "my-repo",
      fullName: "user/my-repo",
      description: null,
      language: "TypeScript",
      webhookId: 9999,
    })

    const response = await POST(
      createRequest({
        githubId: 12345,
        name: "my-repo",
        fullName: "user/my-repo",
        language: "TypeScript",
        canAdminister: true,
      })
    )
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(invalidateDashboardForUsers).toHaveBeenCalledWith(["user-1"])
    expect(body.repository).toEqual(
      expect.objectContaining({
        id: "repo-1",
        githubId: 12345,
        name: "my-repo",
        fullName: "user/my-repo",
      })
    )
    expect(mockedCreate).toHaveBeenCalledWith({
      data: {
        githubId: BigInt(12345),
        name: "my-repo",
        fullName: "user/my-repo",
        description: null,
        language: "TypeScript",
        userRepositories: {
          create: {
            userId: "user-1",
          },
        },
      },
      select: expect.any(Object),
    })
    expect(mockedSyncRepositoryPullRequests).toHaveBeenCalledWith({
      octokit: expect.any(Object),
      owner: "user",
      repo: "my-repo",
      repositoryId: "repo-1",
    })
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: "repo-1" },
      data: { webhookId: 9999 },
      select: expect.any(Object),
    })
  })

  it("skips webhook registration when the user cannot administer the repository", async () => {
    const createWebhook = jest.fn()

    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindUnique.mockResolvedValue(null)
    mockedSyncRepositoryPullRequests.mockResolvedValue({
      syncedCount: 0,
      detailHydratedCount: 0,
    })
    mockedGetOctokit.mockResolvedValue({
      rest: {
        repos: {
          createWebhook,
        },
      },
    })
    mockedCreate.mockResolvedValue({
      id: "repo-1",
      githubId: BigInt(12345),
      name: "my-repo",
      fullName: "user/my-repo",
      description: null,
      language: "TypeScript",
      webhookId: null,
    })

    const response = await POST(
      createRequest({
        githubId: 12345,
        name: "my-repo",
        fullName: "user/my-repo",
        language: "TypeScript",
        canAdminister: false,
      })
    )

    expect(response.status).toBe(201)
    expect(createWebhook).not.toHaveBeenCalled()
    expect(mockedUpdate).not.toHaveBeenCalled()
    expect(mockedSyncRepositoryPullRequests).toHaveBeenCalledWith({
      octokit: expect.any(Object),
      owner: "user",
      repo: "my-repo",
      repositoryId: "repo-1",
    })
  })

  it("returns 401 for anonymous users", async () => {
    mockedAuth.mockResolvedValue(null)

    const response = await POST(
      createRequest({ githubId: 12345, name: "repo", fullName: "user/repo" })
    )
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
    expect(invalidateDashboardForUsers).not.toHaveBeenCalled()
  })

  it("returns 400 when required fields are missing", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })

    const response = await POST(createRequest({ githubId: 12345 }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain("required")
  })

  it("returns 409 when the repository is already connected", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindUnique.mockResolvedValue({
      id: "existing-repo",
      githubId: BigInt(12345),
      name: "repo",
      fullName: "user/repo",
      description: null,
      language: null,
      webhookId: null,
    })
    mockedConnectRepositoryToUser.mockResolvedValue("existing")

    const response = await POST(
      createRequest({ githubId: 12345, name: "repo", fullName: "user/repo" })
    )
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toContain("already connected")
  })

  it("syncs PRs when connecting an existing shared repository", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindUnique.mockResolvedValue({
      id: "existing-repo",
      githubId: BigInt(12345),
      name: "repo",
      fullName: "user/repo",
      description: null,
      language: null,
      webhookId: 9999,
    })
    mockedConnectRepositoryToUser.mockResolvedValue("created")
    mockedGetRepositoryMemberIds.mockResolvedValue(["user-1", "user-2"])
    mockedGetOctokit.mockResolvedValue({ rest: { repos: {} } })
    mockedSyncRepositoryPullRequests.mockResolvedValue({
      syncedCount: 12,
      detailHydratedCount: 3,
    })

    const response = await POST(
      createRequest({ githubId: 12345, name: "repo", fullName: "user/repo" })
    )

    expect(response.status).toBe(201)
    expect(mockedSyncRepositoryPullRequests).toHaveBeenCalledWith({
      octokit: expect.any(Object),
      owner: "user",
      repo: "repo",
      repositoryId: "existing-repo",
    })
    expect(invalidateDashboardForUsers).toHaveBeenCalledWith([
      "user-1",
      "user-2",
    ])
  })

  it("returns 500 on unexpected errors", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindUnique.mockRejectedValue(new Error("DB error"))

    const response = await POST(
      createRequest({ githubId: 12345, name: "repo", fullName: "user/repo" })
    )
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe("Internal server error")
  })
})
