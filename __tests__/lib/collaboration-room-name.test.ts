import { getCollaborationRoomDisplayName } from "@/lib/collaboration/room-name"

describe("getCollaborationRoomDisplayName", () => {
  it("shows old default room names with the new label", () => {
    expect(getCollaborationRoomDisplayName("PR #7 협업방", 7)).toBe("PR #7 리뷰방")
  })

  it("preserves custom names and names for other PRs", () => {
    expect(getCollaborationRoomDisplayName("함께 보는 방", 7)).toBe("함께 보는 방")
    expect(getCollaborationRoomDisplayName("PR #8 협업방", 7)).toBe("PR #8 협업방")
  })
})
