import { getConnectedRepositoriesForUser } from "@/lib/dal/repositories"
import { prisma } from "@/lib/prisma"
import { buildAccessibleRepositoryWhere } from "@/lib/repository-access"

jest.mock("server-only", () => ({}), { virtual: true })

jest.mock("@/lib/prisma", () => ({
  prisma: { repository: { findMany: jest.fn() } },
}))

jest.mock("@/lib/repository-access", () => ({
  buildAccessibleRepositoryWhere: jest.fn(),
}))

const mockedFindMany = prisma.repository.findMany as jest.Mock
const mockedBuildAccessibleRepositoryWhere =
  buildAccessibleRepositoryWhere as jest.Mock

describe("getConnectedRepositoriesForUser", () => {
  afterEach(() => jest.clearAllMocks())

  it("selects only client-safe fields from accessible repositories", async () => {
    const repositories = [
      { id: "repo-1", name: "repo", fullName: "owner/repo" },
    ]
    mockedBuildAccessibleRepositoryWhere.mockResolvedValue({
      id: { in: ["repo-1"] },
    })
    mockedFindMany.mockResolvedValue(repositories)

    await expect(getConnectedRepositoriesForUser("user-1")).resolves.toEqual(
      repositories
    )
    expect(mockedBuildAccessibleRepositoryWhere).toHaveBeenCalledWith("user-1")
    expect(mockedFindMany).toHaveBeenCalledWith({
      where: { id: { in: ["repo-1"] } },
      select: { id: true, name: true, fullName: true },
      orderBy: { name: "asc" },
    })
  })
})
