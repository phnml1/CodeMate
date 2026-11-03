import { GET, POST } from "@/app/api/repositories/route"
import { auth } from "@/lib/auth"
import { getConnectedRepositoriesForUser } from "@/lib/dal/repositories"
import { invalidateDashboardForUsers } from "@/lib/dashboard-cache"
import { getOctokit, isGitHubReconnectRequiredError } from "@/lib/github"
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
  isGitHubReconnectRequiredError: jest.fn((error) => error?.status === 401),
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
const mockedIsGitHubReconnectRequiredError = isGitHubReconnectRequiredError as jest.Mock
const mockedFindUnique = prisma.repository.findUnique as jest.Mock
const mockedCreate = prisma.repository.create as jest.Mock
const mockedUpdate = prisma.repository.update as jest.Mock
const mockedSyncRepositoryPullRequests = syncRepositoryPullRequests as jest.Mock
const mockedConnectRepositoryToUser = connectRepositoryToUser as jest.Mock
const mockedGetRepositoryMemberIds = getRepositoryMemberIds as jest.Mock
const mockedIsRepositoryMembershipMigrationError =
  isRepositoryMembershipMigrationError as jest.Mock
const listForAuthenticatedUser = jest.fn()
const paginate = jest.fn()
const createWebhook = jest.fn()

function mockGitHubRepository(permissions = { admin: true }) {
  paginate.mockResolvedValue([{
    id: 12345,
    name: "my-repo",
    full_name: "user/my-repo",
    description: null,
    language: "TypeScript",
    permissions,
  }])
}

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
  beforeEach(() => {
    mockGitHubRepository()
    mockedGetOctokit.mockResolvedValue({
      paginate,
      rest: { repos: { listForAuthenticatedUser, createWebhook } },
    })
  })

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
    createWebhook.mockResolvedValue({ data: { id: 9999 } })
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
    expect(paginate).toHaveBeenCalledWith(listForAuthenticatedUser, { per_page: 100 })
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
    mockGitHubRepository({ admin: false })

    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindUnique.mockResolvedValue(null)
    mockedSyncRepositoryPullRequests.mockResolvedValue({
      syncedCount: 0,
      detailHydratedCount: 0,
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
        canAdminister: true,
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

    const response = await POST(createRequest({}))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain("required")
  })

  it("returns 409 when the repository is already connected", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    paginate.mockResolvedValue([{ id: 12345, name: "repo", full_name: "user/repo", description: null, language: null, permissions: { admin: false } }])
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

  it("rejects a forged repository ID before granting membership", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })

    const response = await POST(createRequest({
      githubId: 54321,
      name: "private-repo",
      fullName: "other/private-repo",
      canAdminister: true,
    }))

    expect(response.status).toBe(403)
    expect(mockedFindUnique).not.toHaveBeenCalled()
    expect(mockedCreate).not.toHaveBeenCalled()
    expect(mockedConnectRepositoryToUser).not.toHaveBeenCalled()
  })

  it("uses GitHub's canonical metadata instead of forged browser fields", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindUnique.mockResolvedValue(null)
    mockedCreate.mockResolvedValue({
      id: "repo-1", githubId: BigInt(12345), name: "my-repo",
      fullName: "user/my-repo", description: null,
      language: "TypeScript", webhookId: null,
    })
    mockedSyncRepositoryPullRequests.mockResolvedValue({ syncedCount: 0, detailHydratedCount: 0 })

    const response = await POST(createRequest({
      githubId: 12345,
      name: "forged", fullName: "attacker/forged", canAdminister: true,
    }))

    expect(response.status).toBe(201)
    expect(mockedCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ name: "my-repo", fullName: "user/my-repo" }),
    }))
    expect(mockedSyncRepositoryPullRequests).toHaveBeenCalledWith(expect.objectContaining({
      owner: "user", repo: "my-repo",
    }))
  })

  it("syncs PRs when connecting an existing shared repository", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    paginate.mockResolvedValue([{ id: 12345, name: "repo", full_name: "user/repo", description: null, language: null, permissions: { admin: false } }])
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

  it("returns 401 when the GitHub token has expired", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedGetOctokit.mockRejectedValue({ status: 401 })

    const response = await POST(createRequest({ githubId: 12345 }))

    expect(response.status).toBe(401)
    expect(mockedIsGitHubReconnectRequiredError).toHaveBeenCalled()
    expect(mockedConnectRepositoryToUser).not.toHaveBeenCalled()
  })
})
