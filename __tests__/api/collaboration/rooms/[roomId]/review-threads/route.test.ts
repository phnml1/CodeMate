import { GET } from "@/app/api/collaboration/rooms/[roomId]/review-threads/route"
import { auth } from "@/lib/auth"
import { findAccessibleCollaborationRoom } from "@/lib/collaboration/rooms"
import { prisma } from "@/lib/prisma"

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/collaboration/rooms", () => ({
  findAccessibleCollaborationRoom: jest.fn(),
  collaborationMessageInclude: {},
  serializeCollaborationMessage: jest.fn((message) => message),
}))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    review: { findFirst: jest.fn() },
    collaborationMessage: { findMany: jest.fn() },
  },
}))

const context = { params: Promise.resolve({ roomId: "room-1" }) }
const request = (reviewId = "review-1") => new Request(
  `http://localhost/api/collaboration/rooms/room-1/review-threads?reviewId=${reviewId}`
)

describe("GET /api/collaboration/rooms/[roomId]/review-threads", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } })
    ;(findAccessibleCollaborationRoom as jest.Mock).mockResolvedValue({
      id: "room-1",
      pullRequestId: "pr-1",
    })
    ;(prisma.review.findFirst as jest.Mock).mockResolvedValue({ id: "review-1" })
    ;(prisma.collaborationMessage.findMany as jest.Mock).mockResolvedValue([])
  })

  it("requires authentication and room access", async () => {
    ;(auth as jest.Mock).mockResolvedValueOnce(null)
    expect((await GET(request(), context)).status).toBe(401)

    ;(findAccessibleCollaborationRoom as jest.Mock).mockResolvedValueOnce(null)
    expect((await GET(request(), context)).status).toBe(404)
  })

  it("only loads a review belonging to the room pull request", async () => {
    ;(prisma.review.findFirst as jest.Mock).mockResolvedValueOnce(null)
    expect((await GET(request("other-review"), context)).status).toBe(404)
    expect(prisma.review.findFirst).toHaveBeenCalledWith({
      where: { id: "other-review", pullRequestId: "pr-1" },
      select: { id: true },
    })
  })

  it("returns the room messages anchored to the selected AI review", async () => {
    const messages = [{ id: "message-1", content: "이 제안을 적용할까요?" }]
    ;(prisma.collaborationMessage.findMany as jest.Mock).mockResolvedValue(messages)

    const response = await GET(request(), context)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ messages })
    expect(prisma.collaborationMessage.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        roomId: "room-1",
        reviewReference: { is: { reviewId: "review-1" } },
      },
      orderBy: { createdAt: "asc" },
    }))
  })
})
