import { GET, PUT } from "@/app/api/notifications/settings/route"
import { prisma } from "@/lib/prisma"
import * as authModule from "@/lib/auth"

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    notificationSetting: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}))

const mockedAuth = authModule.auth as jest.Mock
const mockedFindUnique = prisma.notificationSetting.findUnique as jest.Mock
const mockedUpsert = prisma.notificationSetting.upsert as jest.Mock

describe("GET /api/notifications/settings", () => {
  afterEach(() => jest.clearAllMocks())

  it("인증되지 않은 사용자는 401을 반환한다", async () => {
    mockedAuth.mockResolvedValue(null)

    const res = await GET()

    expect(res.status).toBe(401)
  })

  it("설정이 없으면 기본값을 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindUnique.mockResolvedValue(null)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.settings).toEqual({
      mentionEnabled: true,
      newReviewEnabled: true,
      prMergedEnabled: true,
      commentReplyEnabled: true,
    })
  })

  it("저장된 설정을 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindUnique.mockResolvedValue({
      mentionEnabled: true,
      newReviewEnabled: false,
      prMergedEnabled: true,
      commentReplyEnabled: false,
    })

    const res = await GET()
    const body = await res.json()

    expect(body.settings.newReviewEnabled).toBe(false)
    expect(body.settings.commentReplyEnabled).toBe(false)
  })
})

describe("PUT /api/notifications/settings", () => {
  afterEach(() => jest.clearAllMocks())

  it("인증되지 않은 사용자는 401을 반환한다", async () => {
    mockedAuth.mockResolvedValue(null)

    const res = await PUT(
      new Request("http://localhost/api/notifications/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
    )

    expect(res.status).toBe(401)
  })

  it("설정을 성공적으로 저장한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    const settings = {
      mentionEnabled: true,
      newReviewEnabled: false,
      prMergedEnabled: true,
      commentReplyEnabled: false,
    }
    mockedUpsert.mockResolvedValue(settings)

    const res = await PUT(
      new Request("http://localhost/api/notifications/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.settings.newReviewEnabled).toBe(false)
    expect(mockedUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        create: expect.objectContaining({ userId: "user-1", newReviewEnabled: false }),
        update: expect.objectContaining({ newReviewEnabled: false }),
      })
    )
  })
})
