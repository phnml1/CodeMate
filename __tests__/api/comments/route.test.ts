import { GET } from "@/app/api/comments/route"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

const mockedAuth = auth as jest.Mock
const mockedTransaction = prisma.$transaction as jest.Mock

const sampleComment = {
  id: "comment-1",
  content: "좋은 코드입니다.",
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
  author: { id: "user-1", name: "홍길동", image: null },
  pullRequest: {
    id: "pr-1",
    title: "feat: 대시보드 추가",
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

  it("미인증 사용자는 401을 반환한다", async () => {
    mockedAuth.mockResolvedValue(null)

    const response = await GET(createRequest())
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
  })

  it("전체 댓글 목록을 최신순으로 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
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

  it("repoId 필터를 적용하면 해당 저장소 댓글만 조회한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedTransaction.mockResolvedValue([[sampleComment], 1])

    const response = await GET(createRequest({ repoId: "repo-1" }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockedTransaction).toHaveBeenCalledTimes(1)
    const [[findManyCall]] = mockedTransaction.mock.calls
    // $transaction은 [findMany promise, count promise]를 인자로 받음
    expect(body.pagination.total).toBe(1)
  })

  it("authorId 필터를 적용하면 해당 작성자의 댓글만 조회한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedTransaction.mockResolvedValue([[sampleComment], 1])

    const response = await GET(createRequest({ authorId: "user-1" }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.comments[0].authorId).toBe("user-1")
  })

  it("댓글이 없으면 빈 배열과 pagination을 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedTransaction.mockResolvedValue([[], 0])

    const response = await GET(createRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.comments).toHaveLength(0)
    expect(body.pagination.total).toBe(0)
    expect(body.pagination.totalPages).toBe(0)
  })

  it("page/limit 쿼리 파라미터를 처리한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedTransaction.mockResolvedValue([[sampleComment], 25])

    const response = await GET(createRequest({ page: "2", limit: "10" }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.pagination.page).toBe(2)
    expect(body.pagination.limit).toBe(10)
    expect(body.pagination.totalPages).toBe(3)
  })

  it("서버 오류 시 500을 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedTransaction.mockRejectedValue(new Error("DB error"))

    const response = await GET(createRequest())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe("Internal server error")
  })
})
