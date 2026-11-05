import { upsertReviewNotifications } from "@/lib/review-notifications"
import { prisma } from "@/lib/prisma"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  },
}))

const mockedNotification = prisma.notification as unknown as {
  findFirst: jest.Mock
  update: jest.Mock
  create: jest.Mock
}

const params = {
  userIds: ["user-1"],
  prId: "pr-1",
  prTitle: "Fix review progress",
  prNumber: 213,
}

describe("upsertReviewNotifications", () => {
  beforeEach(() => jest.clearAllMocks())

  it("updates an existing pending notification with an explicit completed status", async () => {
    mockedNotification.findFirst.mockResolvedValue({ id: "notification-1" })

    await upsertReviewNotifications({ ...params, status: "COMPLETED" })

    expect(mockedNotification.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "notification-1" },
      data: expect.objectContaining({
        reviewStatus: "COMPLETED",
        title: "AI 리뷰 완료",
        isRead: false,
      }),
    }))
  })

  it("creates a failed notification with an explicit failed status", async () => {
    mockedNotification.findFirst.mockResolvedValue(null)

    await upsertReviewNotifications({ ...params, status: "FAILED" })

    expect(mockedNotification.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        type: "NEW_REVIEW",
        reviewStatus: "FAILED",
        title: "AI 리뷰 실패",
      }),
    }))
  })
})
