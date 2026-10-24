import { DELETE, PATCH } from "@/app/api/comments/[id]/route"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { emitCollaborationMessageDeleted, emitCollaborationMessageUpdated } from "@/lib/socket/emitter"

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/prisma", () => ({ prisma: {
  comment: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  collaborationMessage: { delete: jest.fn() },
} }))
jest.mock("@/lib/socket/emitter", () => ({
  emitCollaborationMessageUpdated: jest.fn(),
  emitCollaborationMessageDeleted: jest.fn(),
}))

const mockedAuth = auth as jest.Mock
const mockedFindComment = prisma.comment.findUnique as jest.Mock
const mockedUpdateComment = prisma.comment.update as jest.Mock
const mockedDeleteComment = prisma.comment.delete as jest.Mock
const mockedDeleteMessage = prisma.collaborationMessage.delete as jest.Mock
const mockedEmitUpdated = emitCollaborationMessageUpdated as jest.Mock
const mockedEmitDeleted = emitCollaborationMessageDeleted as jest.Mock
const params = { params: Promise.resolve({ id: "review-1" }) }
const request = (content: string) => new Request("http://localhost/api/comments/review-1", {
  method: "PATCH",
  body: JSON.stringify({ content }),
})

describe("linked collaboration code review", () => {
  beforeEach(() => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindComment.mockResolvedValue({ id: "review-1", authorId: "user-1", collaborationMessageId: "message-1" })
    mockedUpdateComment.mockResolvedValue({
      id: "review-1",
      content: "새 내용",
      collaborationMessage: {
        id: "message-1", roomId: "room-1", authorId: "user-1",
        author: { id: "user-1", name: "Reviewer", image: null },
        content: "새 내용", clientMessageId: null, codeReference: null,
        createdAt: new Date("2026-10-23T00:00:00.000Z"),
        updatedAt: new Date("2026-10-23T00:01:00.000Z"),
      },
    })
    mockedDeleteMessage.mockResolvedValue({ id: "message-1", roomId: "room-1" })
    mockedEmitUpdated.mockResolvedValue(undefined)
    mockedEmitDeleted.mockResolvedValue(undefined)
  })
  afterEach(() => jest.clearAllMocks())

  it("updates the review and source message atomically, then broadcasts", async () => {
    const response = await PATCH(request("  새 내용  "), params)

    expect(response.status).toBe(200)
    expect(mockedUpdateComment).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "review-1" },
      data: { content: "새 내용", collaborationMessage: { update: { content: "새 내용" } } },
    }))
    expect(mockedEmitUpdated).toHaveBeenCalledWith(expect.objectContaining({
      roomId: "room-1", id: "message-1", content: "새 내용",
    }))
    expect(mockedUpdateComment.mock.invocationCallOrder[0]).toBeLessThan(mockedEmitUpdated.mock.invocationCallOrder[0])
  })

  it("deletes the source message and cascades the linked review before broadcasting", async () => {
    const response = await DELETE(new Request("http://localhost/api/comments/review-1", { method: "DELETE" }), params)

    expect(response.status).toBe(200)
    expect(mockedDeleteMessage).toHaveBeenCalledWith({
      where: { id: "message-1" }, select: { id: true, roomId: true },
    })
    expect(mockedDeleteComment).not.toHaveBeenCalled()
    expect(mockedEmitDeleted).toHaveBeenCalledWith("room-1", "message-1")
    expect(mockedDeleteMessage.mock.invocationCallOrder[0]).toBeLessThan(mockedEmitDeleted.mock.invocationCallOrder[0])
  })

  it("keeps ordinary reviews on the existing delete path", async () => {
    mockedFindComment.mockResolvedValue({ id: "review-1", authorId: "user-1", collaborationMessageId: null })

    expect((await DELETE(new Request("http://localhost/api/comments/review-1", { method: "DELETE" }), params)).status).toBe(200)
    expect(mockedDeleteComment).toHaveBeenCalledWith({ where: { id: "review-1" } })
    expect(mockedDeleteMessage).not.toHaveBeenCalled()
  })

  it("denies editing another author's review", async () => {
    mockedFindComment.mockResolvedValue({ id: "review-1", authorId: "user-2", collaborationMessageId: "message-1" })

    expect((await PATCH(request("새 내용"), params)).status).toBe(403)
    expect(mockedUpdateComment).not.toHaveBeenCalled()
  })
})
