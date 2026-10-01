import CollaborationRoomPage from "@/app/(workspace)/collaboration/rooms/[roomId]/page"
import { findAccessibleCollaborationRoom } from "@/lib/collaboration/rooms"
import { requireCurrentUser } from "@/lib/dal/session"
import { notFound } from "next/navigation"

jest.mock("next/navigation", () => ({ notFound: jest.fn() }))
jest.mock("@/lib/dal/session", () => ({ requireCurrentUser: jest.fn() }))
jest.mock("@/lib/collaboration/rooms", () => ({
  findAccessibleCollaborationRoom: jest.fn(),
  serializeCollaborationRoom: jest.fn((room) => room),
}))
jest.mock("@/components/collaboration/CollaborationWorkspaceClient", () => jest.fn())

describe("CollaborationRoomPage", () => {
  afterEach(() => jest.clearAllMocks())

  it("passes an accessible room and current user to the workspace", async () => {
    const room = { id: "room-1", pullRequestId: "pr-1" }
    ;(requireCurrentUser as jest.Mock).mockResolvedValue({ id: "user-1" })
    ;(findAccessibleCollaborationRoom as jest.Mock).mockResolvedValue(room)

    const page = await CollaborationRoomPage({ params: Promise.resolve({ roomId: "room-1" }) })

    expect(findAccessibleCollaborationRoom).toHaveBeenCalledWith("user-1", "room-1")
    expect(page.props).toEqual({ room, currentUserId: "user-1" })
  })

  it("hides rooms the user cannot access", async () => {
    ;(requireCurrentUser as jest.Mock).mockResolvedValue({ id: "user-2" })
    ;(findAccessibleCollaborationRoom as jest.Mock).mockResolvedValue(null)
    ;(notFound as unknown as jest.Mock).mockImplementation(() => {
      throw new Error("NEXT_HTTP_ERROR_FALLBACK;404")
    })

    await expect(CollaborationRoomPage({ params: Promise.resolve({ roomId: "room-1" }) }))
      .rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404")
  })
})
