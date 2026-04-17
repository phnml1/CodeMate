import { GET } from "@/app/api/comments/route"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildAccessibleRepositoryWhere } from "@/lib/repository-access"

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    comment: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

jest.mock("@/lib/repository-access", () => ({
  buildAccessibleRepositoryWhere: jest.fn(),
}))

const mockedAuth = auth as jest.Mock
const mockedTransaction = prisma.$transaction as jest.Mock
const mockedBuildAccessibleRepositoryWhere =
  buildAccessibleRepositoryWhere as jest.Mock

const sampleComment = {
  id: "comment-1",
  content: "Nice code",
  lineNumber: null,
  filePath: null,
  isResolved: false,
  pullRequestId: "pr-1",
  authorId: "user-1",
  parentId: null,
  mentions: [],
  reactions: {},
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  author: { id: "user-1", name: "Tester", image: null },
  pullRequest: {
    id: "pr-1",
    title: "feat: Add dashboard",
    number: 42,
    repoId: "repo-1",
    repo: { name: "awesome-app" },
  },
}

function createRequest(params?: Record<string, string>) {
  const url = new URL("http://localhost/api/comments")
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  return new Request(url.toString())
}

describe("GET /api/comments", () => {
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

  it("returns paginated comments", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessibleRepositoryWhere.mockResolvedValue({ id: { in: ["repo-1"] } })
    mockedTransaction.mockResolvedValue([[sampleComment], 1])

    const response = await GET(createRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.comments).toHaveLength(1)
    expect(body.comments[0].id).toBe("comment-1")
    expect(body.pagination).toEqual({
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    })
  })

  it("supports repoId filters", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessibleRepositoryWhere.mockResolvedValue({ id: { in: ["repo-1"] } })
    mockedTransaction.mockResolvedValue([[sampleComment], 1])

    const response = await GET(createRequest({ repoId: "repo-1" }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockedBuildAccessibleRepositoryWhere).toHaveBeenCalledWith(
      "user-1",
      "repo-1"
    )
    expect(body.pagination.total).toBe(1)
  })

  it("supports authorId filters", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessibleRepositoryWhere.mockResolvedValue({ id: { in: ["repo-1"] } })
    mockedTransaction.mockResolvedValue([[sampleComment], 1])

    const response = await GET(createRequest({ authorId: "user-1" }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.comments[0].authorId).toBe("user-1")
  })

  it("returns empty pagination when there are no comments", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessibleRepositoryWhere.mockResolvedValue({ id: { in: ["repo-1"] } })
    mockedTransaction.mockResolvedValue([[], 0])

    const response = await GET(createRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.comments).toHaveLength(0)
    expect(body.pagination.total).toBe(0)
    expect(body.pagination.totalPages).toBe(0)
  })

  it("supports page and limit parameters", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessibleRepositoryWhere.mockResolvedValue({ id: { in: ["repo-1"] } })
    mockedTransaction.mockResolvedValue([[sampleComment], 25])

    const response = await GET(createRequest({ page: "2", limit: "10" }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.pagination.page).toBe(2)
    expect(body.pagination.limit).toBe(10)
    expect(body.pagination.totalPages).toBe(3)
  })

  it("returns 500 on unexpected errors", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedBuildAccessibleRepositoryWhere.mockResolvedValue({ id: { in: ["repo-1"] } })
    mockedTransaction.mockRejectedValue(new Error("DB error"))

    const response = await GET(createRequest())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe("Internal server error")
  })
})
