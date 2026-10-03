import { GET } from "@/app/api/collaboration/rooms/[roomId]/code-threads/route"
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
    collaborationCodeReference: { groupBy: jest.fn() },
    collaborationMessage: { findMany: jest.fn() },
  },
}))

const roomId = "room-1"
const revision = { baseSha: "a".repeat(40), headSha: "b".repeat(40) }
const context = { params: Promise.resolve({ roomId }) }

function request(extra = "") {
  const params = new URLSearchParams({ filePath: "src/app.ts", ...revision })
  return new Request(`http://localhost/api/collaboration/rooms/${roomId}/code-threads?${params}${extra}`)
}

describe("GET /api/collaboration/rooms/[roomId]/code-threads", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } })
    ;(findAccessibleCollaborationRoom as jest.Mock).mockResolvedValue({ id: roomId })
  })

  it("requires an authenticated user with room access", async () => {
    ;(auth as jest.Mock).mockResolvedValueOnce(null)
    expect((await GET(request(), context)).status).toBe(401)

    ;(findAccessibleCollaborationRoom as jest.Mock).mockResolvedValueOnce(null)
    expect((await GET(request(), context)).status).toBe(404)
  })

  it("rejects invalid anchors", async () => {
    const invalid = new Request(`http://localhost/api/collaboration/rooms/${roomId}/code-threads?filePath=src/app.ts`)
    expect((await GET(invalid, context)).status).toBe(400)
    expect((await GET(request("&side=RIGHT"), context)).status).toBe(400)
  })

  it("returns counts for current and legacy code references", async () => {
    ;(prisma.collaborationCodeReference.groupBy as jest.Mock).mockResolvedValue([
      { side: "RIGHT", startLine: 42, _count: { _all: 3 } },
    ])

    const response = await GET(request(), context)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ threads: [{ side: "RIGHT", startLine: 42, count: 3 }] })
    expect(prisma.collaborationCodeReference.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      by: ["side", "startLine"],
      where: expect.objectContaining({ message: { roomId } }),
    }))
  })

  it("loads one anchored conversation", async () => {
    ;(prisma.collaborationMessage.findMany as jest.Mock).mockResolvedValue([
      { id: "message-1", content: "여기 봐주세요" },
    ])

    const response = await GET(request("&side=RIGHT&startLine=42"), context)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      messages: [{ id: "message-1", content: "여기 봐주세요" }],
      nextCursor: null,
    })
    expect(prisma.collaborationMessage.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ roomId }),
    }))
  })
})
