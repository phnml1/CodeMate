import { DELETE, PATCH } from "@/app/api/collaboration/rooms/[roomId]/messages/[messageId]/route"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildAccessiblePullRequestWhere } from "@/lib/repository-access"
import { emitCollaborationMessageDeleted, emitCollaborationMessageUpdated } from "@/lib/socket/emitter"

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/prisma", () => ({ prisma: {
  collaborationRoom: { findFirst: jest.fn() },
  collaborationMessage: { findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
} }))
jest.mock("@/lib/repository-access", () => ({ buildAccessiblePullRequestWhere: jest.fn() }))
jest.mock("@/lib/socket/emitter", () => ({
  emitCollaborationMessageUpdated: jest.fn(),
  emitCollaborationMessageDeleted: jest.fn(),
}))

const mockedAuth = auth as jest.Mock
const mockedRoom = prisma.collaborationRoom.findFirst as jest.Mock
const mockedMessage = prisma.collaborationMessage.findFirst as jest.Mock
const mockedUpdate = prisma.collaborationMessage.update as jest.Mock
const mockedDelete = prisma.collaborationMessage.delete as jest.Mock
const mockedEmitUpdated = emitCollaborationMessageUpdated as jest.Mock
const mockedEmitDeleted = emitCollaborationMessageDeleted as jest.Mock
const mockedAccess = buildAccessiblePullRequestWhere as jest.Mock

const now = new Date("2026-10-23T00:00:00.000Z")
const savedMessage = {
  id: "message-1",
  roomId: "room-1",
  authorId: "user-1",
  author: { id: "user-1", name: "Author", image: null },
  content: "수정한 내용",
  clientMessageId: "client-1",
  codeReference: { filePath: "app/page.tsx", side: "RIGHT", startLine: 7, endLine: 7 },
  createdAt: now,
  updatedAt: new Date("2026-10-23T00:01:00.000Z"),
}
const params = { params: Promise.resolve({ roomId: "room-1", messageId: "message-1" }) }
const patchRequest = (body: unknown) => new Request("http://localhost/api/collaboration/rooms/room-1/messages/message-1", {
  method: "PATCH",
  body: JSON.stringify(body),
})
const deleteRequest = () => new Request("http://localhost/api/collaboration/rooms/room-1/messages/message-1", {
  method: "DELETE",
})

describe("collaboration message edit and delete", () => {
  beforeEach(() => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedAccess.mockResolvedValue({ repoId: { in: ["repo-1"] } })
    mockedRoom.mockResolvedValue({ id: "room-1", status: "ACTIVE" })
    mockedMessage.mockResolvedValue({ id: "message-1", authorId: "user-1" })
    mockedUpdate.mockResolvedValue(savedMessage)
    mockedDelete.mockResolvedValue(savedMessage)
    mockedEmitUpdated.mockResolvedValue(undefined)
    mockedEmitDeleted.mockResolvedValue(undefined)
  })
  afterEach(() => jest.clearAllMocks())

  it("requires authentication", async () => {
    mockedAuth.mockResolvedValue(null)
    expect((await PATCH(patchRequest({ content: "edit" }), params)).status).toBe(401)
    expect((await DELETE(deleteRequest(), params)).status).toBe(401)
  })

  it("rejects editing or deleting another author's message", async () => {
    mockedMessage.mockResolvedValue({ id: "message-1", authorId: "user-2" })
    expect((await PATCH(patchRequest({ content: "edit" }), params)).status).toBe(403)
    expect((await DELETE(deleteRequest(), params)).status).toBe(403)
    expect(mockedUpdate).not.toHaveBeenCalled()
    expect(mockedDelete).not.toHaveBeenCalled()
  })

  it("rejects missing and ended rooms", async () => {
    mockedRoom.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "room-1", status: "ENDED" })
    expect((await PATCH(patchRequest({ content: "edit" }), params)).status).toBe(404)
    expect((await DELETE(deleteRequest(), params)).status).toBe(409)
  })

  it("rejects missing messages and empty edits", async () => {
    mockedMessage.mockResolvedValueOnce(null)
    expect((await PATCH(patchRequest({ content: "edit" }), params)).status).toBe(404)
    expect((await PATCH(patchRequest({ content: "  " }), params)).status).toBe(400)
    expect(mockedUpdate).not.toHaveBeenCalled()
  })

  it("updates only the content and broadcasts the committed message", async () => {
    const response = await PATCH(patchRequest({ content: "  수정한 내용  " }), params)
    expect(response.status).toBe(200)
    expect((await response.json()).message.content).toBe("수정한 내용")
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: "message-1", roomId: "room-1", authorId: "user-1" },
      data: { content: "수정한 내용" },
      include: expect.any(Object),
    })
    expect(mockedEmitUpdated).toHaveBeenCalledWith(expect.objectContaining({
      id: "message-1", codeReference: savedMessage.codeReference,
    }))
  })

  it("updates the linked PR review with its code-line message", async () => {
    mockedMessage.mockResolvedValue({ id: "message-1", authorId: "user-1", reviewComment: { id: "review-1" } })

    expect((await PATCH(patchRequest({ content: "새 내용" }), params)).status).toBe(200)
    expect(mockedUpdate.mock.calls[0][0].data).toEqual({
      content: "새 내용",
      reviewComment: { update: { content: "새 내용" } },
    })
  })

  it("deletes the message before broadcasting its removal", async () => {
    const response = await DELETE(deleteRequest(), params)
    expect(response.status).toBe(204)
    expect(mockedDelete).toHaveBeenCalledWith({
      where: { id: "message-1", roomId: "room-1", authorId: "user-1" },
    })
    expect(mockedEmitDeleted).toHaveBeenCalledWith("room-1", "message-1")
    expect(mockedDelete.mock.invocationCallOrder[0]).toBeLessThan(mockedEmitDeleted.mock.invocationCallOrder[0])
  })

  it("keeps the DB change when Socket broadcast fails", async () => {
    mockedEmitDeleted.mockRejectedValueOnce(new Error("Socket unavailable"))
    const log = jest.spyOn(console, "error").mockImplementation(() => {})
    try {
      expect((await DELETE(deleteRequest(), params)).status).toBe(204)
      expect(mockedDelete).toHaveBeenCalledTimes(1)
    } finally {
      log.mockRestore()
    }
  })
})
