import {
  createCollaborationRoomSchema,
  updateCollaborationRoomSchema,
  serializeCollaborationRoom,
} from "@/lib/collaboration/rooms"

jest.mock("@/lib/prisma", () => ({ prisma: {} }))

describe("collaboration room capacity", () => {
  it("accepts at most four people for creation and updates", () => {
    expect(createCollaborationRoomSchema.safeParse({ pullRequestId: "pr-1", capacity: 4 }).success).toBe(true)
    expect(createCollaborationRoomSchema.safeParse({ pullRequestId: "pr-1", capacity: 5 }).success).toBe(false)
    expect(updateCollaborationRoomSchema.safeParse({ capacity: 4 }).success).toBe(true)
    expect(updateCollaborationRoomSchema.safeParse({ capacity: 5 }).success).toBe(false)
  })

  it("shows legacy rooms with the new four-person limit", () => {
    const room = {
      id: "room-1",
      name: "Review",
      status: "ACTIVE" as const,
      capacity: 8,
      presenceScope: "local",
      pullRequestId: "pr-1",
      ownerId: "user-1",
      owner: { id: "user-1", name: "Owner", image: null },
      pullRequest: { id: "pr-1", number: 1, title: "PR", repoId: "repo-1", repo: { id: "repo-1", name: "Repo", fullName: "owner/repo" } },
      members: [],
      _count: { messages: 0 },
      endedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    expect(serializeCollaborationRoom(room).capacity).toBe(4)
  })
})
