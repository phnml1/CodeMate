import { DELETE } from "@/app/api/repositories/[id]/route"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }) as jest.Mock)
jest.mock("@/lib/prisma", () => ({
  prisma: {
    repository: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}) as jest.Mock)

const mockedAuth = auth as jest.Mock
const mockedFindUnique = prisma.repository.findUnique as jest.Mock
const mockedDelete = prisma.repository.delete as jest.Mock

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
  })

  it("Repository 해제에 성공하면 200을 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindUnique.mockResolvedValue({
      id: "repo-1",
      githubId: 12345,
      userId: "user-1",
    })
    mockedDelete.mockResolvedValue({})

    const { request, params } = createRequest("repo-1")
    const response = await DELETE(request, { params })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.message).toContain("해제")
    expect(mockedDelete).toHaveBeenCalledWith({ where: { id: "repo-1" } })
  })

  it("미인증 사용자는 401을 반환한다", async () => {
    mockedAuth.mockResolvedValue(null)

    const { request, params } = createRequest("repo-1")
    const response = await DELETE(request, { params })
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
  })

  it("존재하지 않는 Repository는 404를 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindUnique.mockResolvedValue(null)

    const { request, params } = createRequest("nonexistent")
    const response = await DELETE(request, { params })
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toContain("찾을 수 없습니다")
  })

  it("다른 사용자의 Repository는 403을 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindUnique.mockResolvedValue({
      id: "repo-1",
      githubId: 12345,
      userId: "user-2",
    })

    const { request, params } = createRequest("repo-1")
    const response = await DELETE(request, { params })
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toContain("권한")
  })

  it("서버 에러 시 500을 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindUnique.mockRejectedValue(new Error("DB error"))

    const { request, params } = createRequest("repo-1")
    const response = await DELETE(request, { params })
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe("Internal server error")
  })
})
