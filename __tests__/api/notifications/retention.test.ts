import { GET as cleanupNotifications } from "@/app/api/cron/cleanup-notifications/route"
import { PATCH as markNotificationsRead } from "@/app/api/notifications/read/route"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}))

const mockedAuth = auth as jest.Mock
const mockedDeleteMany = prisma.notification.deleteMany as jest.Mock
const mockedUpdateMany = prisma.notification.updateMany as jest.Mock
const originalCronSecret = process.env.CRON_SECRET

afterEach(() => {
  jest.useRealTimers()
  jest.clearAllMocks()
  if (originalCronSecret === undefined) {
    delete process.env.CRON_SECRET
  } else {
    process.env.CRON_SECRET = originalCronSecret
  }
})

describe("read notification retention", () => {
  it("rejects cleanup without a configured secret", async () => {
    delete process.env.CRON_SECRET

    const response = await cleanupNotifications(
      new Request("http://localhost/api/cron/cleanup-notifications", {
        headers: { authorization: "Bearer undefined" },
      })
    )

    expect(response.status).toBe(401)
    expect(mockedDeleteMany).not.toHaveBeenCalled()
  })

  it("rejects cleanup with the wrong secret", async () => {
    process.env.CRON_SECRET = "test-secret"

    const response = await cleanupNotifications(
      new Request("http://localhost/api/cron/cleanup-notifications", {
        headers: { authorization: "Bearer wrong-secret" },
      })
    )

    expect(response.status).toBe(401)
    expect(mockedDeleteMany).not.toHaveBeenCalled()
  })

  it("deletes only notifications read at least seven days ago", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-08T00:00:00.000Z"))
    process.env.CRON_SECRET = "test-secret"
    mockedDeleteMany.mockResolvedValue({ count: 2 })

    const response = await cleanupNotifications(
      new Request("http://localhost/api/cron/cleanup-notifications", {
        headers: { authorization: "Bearer test-secret" },
      })
    )

    expect(response.status).toBe(200)
    expect(mockedDeleteMany).toHaveBeenCalledWith({
      where: {
        isRead: true,
        readAt: { lte: new Date("2026-10-01T00:00:00.000Z") },
      },
    })
    expect(await response.json()).toEqual({ deletedCount: 2 })
  })

  it("records the first read time only for unread notifications", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-08T00:00:00.000Z"))
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedUpdateMany.mockResolvedValue({ count: 1 })

    const response = await markNotificationsRead(
      new Request("http://localhost/api/notifications/read", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: ["notification-1"] }),
      })
    )

    expect(response.status).toBe(200)
    expect(mockedUpdateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        isRead: false,
        id: { in: ["notification-1"] },
      },
      data: { isRead: true, readAt: new Date("2026-10-08T00:00:00.000Z") },
    })
  })
})
