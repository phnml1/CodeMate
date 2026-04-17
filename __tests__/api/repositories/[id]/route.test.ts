import { DELETE } from "@/app/api/repositories/[id]/route"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  detachRepositoryFromUser,
  getRepositoryMemberCount,
  isRepositoryAccessibleToUser,
  isRepositoryMembershipMigrationError,
} from "@/lib/repository-access"

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("@/lib/github", () => ({
  getOctokit: jest.fn(),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    repository: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

jest.mock("@/lib/repository-access", () => ({
  detachRepositoryFromUser: jest.fn(),
  getRepositoryMemberCount: jest.fn(),
  isRepositoryAccessibleToUser: jest.fn(),
  isRepositoryMembershipMigrationError: jest.fn(() => false),
}))

const mockedAuth = auth as jest.Mock
const mockedFindUnique = prisma.repository.findUnique as jest.Mock
const mockedDelete = prisma.repository.delete as jest.Mock
const mockedDetachRepositoryFromUser = detachRepositoryFromUser as jest.Mock
const mockedGetRepositoryMemberCount = getRepositoryMemberCount as jest.Mock
const mockedIsRepositoryAccessibleToUser =
  isRepositoryAccessibleToUser as jest.Mock
const mockedIsRepositoryMembershipMigrationError =
  isRepositoryMembershipMigrationError as jest.Mock

function createRequest(id: string) {
  return {
    request: new Request(`http://localhost/api/repositories/${id}`, {
      method: "DELETE",
    }),
    params: Promise.resolve({ id }),
  }
}

describe("DELETE /api/repositories/[id]", () => {
  afterEach(() => {
    jest.clearAllMocks()
    mockedIsRepositoryMembershipMigrationError.mockReturnValue(false)
  })

  it("removes the repository record when this user is the last member", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindUnique.mockResolvedValue({
      id: "repo-1",
      fullName: "user/repo-1",
      webhookId: null,
    })
    mockedIsRepositoryAccessibleToUser.mockResolvedValue(true)
    mockedGetRepositoryMemberCount.mockResolvedValue(1)
    mockedDelete.mockResolvedValue({})

    const { request, params } = createRequest("repo-1")
    const response = await DELETE(request, { params })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.message).toContain("removed")
    expect(mockedDelete).toHaveBeenCalledWith({ where: { id: "repo-1" } })
  })

  it("returns 401 for anonymous users", async () => {
    mockedAuth.mockResolvedValue(null)

    const { request, params } = createRequest("repo-1")
    const response = await DELETE(request, { params })
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
  })

  it("returns 404 when the repository does not exist", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindUnique.mockResolvedValue(null)

    const { request, params } = createRequest("missing")
    const response = await DELETE(request, { params })
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toContain("not found")
  })

  it("returns 403 when the user is not connected to the repository", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindUnique.mockResolvedValue({
      id: "repo-1",
      fullName: "user/repo-1",
      webhookId: null,
    })
    mockedIsRepositoryAccessibleToUser.mockResolvedValue(false)

    const { request, params } = createRequest("repo-1")
    const response = await DELETE(request, { params })
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe("Forbidden")
  })

  it("removes only the membership when other members remain", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindUnique.mockResolvedValue({
      id: "repo-1",
      fullName: "user/repo-1",
      webhookId: null,
    })
    mockedIsRepositoryAccessibleToUser.mockResolvedValue(true)
    mockedGetRepositoryMemberCount.mockResolvedValue(2)
    mockedDetachRepositoryFromUser.mockResolvedValue(undefined)

    const { request, params } = createRequest("repo-1")
    const response = await DELETE(request, { params })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.message).toContain("connection removed")
    expect(mockedDetachRepositoryFromUser).toHaveBeenCalledWith(
      "user-1",
      "repo-1"
    )
    expect(mockedDelete).not.toHaveBeenCalled()
  })

  it("returns 500 on unexpected errors", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindUnique.mockRejectedValue(new Error("DB error"))

    const { request, params } = createRequest("repo-1")
    const response = await DELETE(request, { params })
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe("Internal server error")
  })
})
