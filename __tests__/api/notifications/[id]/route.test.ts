import { DELETE } from "@/app/api/notifications/[id]/route"
import { prisma } from "@/lib/prisma"
import * as authModule from "@/lib/auth"

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

const mockedAuth = authModule.auth as jest.Mock
const mockedFindFirst = prisma.notification.findFirst as jest.Mock
const mockedDelete = prisma.notification.delete as jest.Mock

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe("DELETE /api/notifications/[id]", () => {
  afterEach(() => jest.clearAllMocks())

  it("인증되지 않은 사용자는 401을 반환한다", async () => {
    mockedAuth.mockResolvedValue(null)

    const res = await DELETE(
      new Request("http://localhost/api/notifications/notif-1", { method: "DELETE" }),
      makeParams("notif-1")
    )

    expect(res.status).toBe(401)
  })

  it("존재하지 않는 알림은 404를 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindFirst.mockResolvedValue(null)

    const res = await DELETE(
      new Request("http://localhost/api/notifications/notif-1", { method: "DELETE" }),
      makeParams("notif-1")
    )
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBe("Notification not found")
  })

  it("알림을 성공적으로 삭제한다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindFirst.mockResolvedValue({ id: "notif-1" })
    mockedDelete.mockResolvedValue({})

    const res = await DELETE(
      new Request("http://localhost/api/notifications/notif-1", { method: "DELETE" }),
      makeParams("notif-1")
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockedDelete).toHaveBeenCalledWith({
      where: { id: "notif-1" },
      select: { id: true },
    })
  })

  it("다른 사용자의 알림은 삭제할 수 없다", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindFirst.mockResolvedValue(null) // 본인 알림이 아니면 findFirst가 null 반환

    const res = await DELETE(
      new Request("http://localhost/api/notifications/notif-2", { method: "DELETE" }),
      makeParams("notif-2")
    )

    expect(res.status).toBe(404)
    expect(mockedDelete).not.toHaveBeenCalled()
  })
})
