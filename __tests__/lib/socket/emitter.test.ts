import { emitCollaborationMessage } from "@/lib/socket/emitter"
import type { CollaborationMessage } from "@/types/collaboration"

const message: CollaborationMessage = {
  id: "message-1",
  roomId: "room-1",
  authorId: "user-1",
  author: { id: "user-1", name: "Reviewer", image: null },
  content: "hello",
  clientMessageId: null,
  codeReference: null,
  createdAt: "2026-09-29T00:00:00.000Z",
  updatedAt: "2026-09-29T00:00:00.000Z",
}

describe("emitCollaborationMessage", () => {
  const originalSecret = process.env.SOCKET_INTERNAL_SECRET
  const originalSocketUrl = process.env.SOCKET_SERVER_URL
  const originalFetch = global.fetch

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.SOCKET_INTERNAL_SECRET
    } else {
      process.env.SOCKET_INTERNAL_SECRET = originalSecret
    }
    if (originalSocketUrl === undefined) {
      delete process.env.SOCKET_SERVER_URL
    } else {
      process.env.SOCKET_SERVER_URL = originalSocketUrl
    }
    global.fetch = originalFetch
  })

  it("broadcasts the saved message only to its collaboration room", async () => {
    process.env.SOCKET_INTERNAL_SECRET = "test-secret"
    process.env.SOCKET_SERVER_URL = "http://localhost:4000"
    const fetchMock = jest.fn().mockResolvedValue({ ok: true })
    global.fetch = fetchMock

    await emitCollaborationMessage(message)

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("http://localhost:4000/internal/emit"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-socket-secret": "test-secret" }),
        body: JSON.stringify({
          room: "collaboration:room-1",
          event: "collaboration:message",
          data: message,
        }),
      })
    )
  })
})
