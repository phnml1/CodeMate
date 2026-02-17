import { POST } from "@/app/api/repositories/route"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    repository: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}))

const mockedAuth = auth as jest.Mock
const mockedFindFirst = prisma.repository.findFirst as jest.Mock
const mockedCreate = prisma.repository.create as jest.Mock

function createRequest(body: object) {
  return new Request("http://localhost/api/repositories", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

describe("POST /api/repositories", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("Repository 연동에 성공하면 201을 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindFirst.mockResolvedValue(null)

    const created = {
      id: "repo-1",
      githubId: 12345,
      name: "my-repo",
      fullName: "user/my-repo",
      description: null,
      language: "TypeScript",
      isActive: true,
      webhookId: null,
      userId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockedCreate.mockResolvedValue(created)

    const response = await POST(
      createRequest({
        githubId: 12345,
        name: "my-repo",
        fullName: "user/my-repo",
        language: "TypeScript",
      })
    )
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.repository).toEqual(expect.objectContaining({
      id: "repo-1",
      githubId: 12345,
      name: "my-repo",
      fullName: "user/my-repo",
    }))
    expect(mockedCreate).toHaveBeenCalledWith({
      data: {
        githubId: 12345,
        name: "my-repo",
        fullName: "user/my-repo",
        description: null,
        language: "TypeScript",
        userId: "user-1",
      },
    })
  })

  it("미인증 사용자는 401을 반환한다", async () => {
    mockedAuth.mockResolvedValue(null)

    const response = await POST(
      createRequest({ githubId: 12345, name: "repo", fullName: "user/repo" })
    )
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
  })

  it("필수 필드가 누락되면 400을 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })

    const response = await POST(createRequest({ githubId: 12345 }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain("필수")
  })

  it("이미 연동된 Repository는 409를 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindFirst.mockResolvedValue({ id: "existing-repo", githubId: 12345 })

    const response = await POST(
      createRequest({ githubId: 12345, name: "repo", fullName: "user/repo" })
    )
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toContain("이미 연동")
  })

  it("서버 에러 시 500을 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindFirst.mockRejectedValue(new Error("DB error"))

    const response = await POST(
      createRequest({ githubId: 12345, name: "repo", fullName: "user/repo" })
    )
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe("Internal server error")
  })
})
