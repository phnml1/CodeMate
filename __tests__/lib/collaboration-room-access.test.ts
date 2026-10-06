import { findAccessibleCollaborationRoom } from "@/lib/collaboration/rooms"
import { prisma } from "@/lib/prisma"

jest.mock("@/lib/prisma", () => ({ prisma: { collaborationRoom: { findFirst: jest.fn() } } }))
jest.mock("@/lib/repository-access", () => ({
  buildAccessiblePullRequestWhere: jest.fn().mockResolvedValue({ repoId: { in: ["repo-1"] } }),
}))

it("limits direct room access to the current environment even when repository access is shared", async () => {
  const previous = process.env.COLLABORATION_PRESENCE_SCOPE
  process.env.COLLABORATION_PRESENCE_SCOPE = "local"
  try {
    await findAccessibleCollaborationRoom("user-1", "production-room")
    expect(prisma.collaborationRoom.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "production-room", presenceScope: "local", pullRequest: { repoId: { in: ["repo-1"] } } },
    }))
  } finally {
    if (previous === undefined) delete process.env.COLLABORATION_PRESENCE_SCOPE
    else process.env.COLLABORATION_PRESENCE_SCOPE = previous
  }
})
