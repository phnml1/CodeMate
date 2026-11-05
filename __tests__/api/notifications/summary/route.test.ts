import { GET } from "@/app/api/notifications/summary/route"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    notification: { count: jest.fn(), findMany: jest.fn() },
  },
}))

const mockedAuth = auth as jest.Mock
const mockedCount = prisma.notification.count as jest.Mock
const mockedFindMany = prisma.notification.findMany as jest.Mock

describe("GET /api/notifications/summary", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns recent unread review status alongside the count", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedCount.mockResolvedValue(1)
    mockedFindMany.mockResolvedValue([{
      id: "notification-1",
      type: "NEW_REVIEW",
      reviewStatus: "COMPLETED",
      title: "AI 리뷰 완료",
      message: "리뷰 결과가 준비됐습니다.",
      isRead: false,
      userId: "user-1",
      prId: "pr-1",
      commentId: null,
      createdAt: new Date("2026-11-05T00:00:05.000Z"),
    }])

    const response = await GET()
    const body = await response.json()

    expect(body.unreadCount).toBe(1)
    expect(body.recentNotifications[0]).toEqual(expect.objectContaining({
      reviewStatus: "COMPLETED",
      createdAt: "2026-11-05T00:00:05.000Z",
    }))
    expect(mockedFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "user-1", isRead: false },
      take: 20,
    }))
  })
})
