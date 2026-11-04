import { POST } from "@/app/api/comments/[id]/github/route"
import { auth } from "@/lib/auth"
import { publishCommentToGitHub, GitHubReviewPublicationError } from "@/lib/github-review-publication"
import { prisma } from "@/lib/prisma"
import { emitCollaborationMessageUpdated } from "@/lib/socket/emitter"

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/collaboration/rooms", () => ({
  collaborationMessageInclude: { reviewComment: true },
  serializeCollaborationMessage: jest.fn((message) => ({
    id: message.id,
    roomId: message.roomId,
    githubStatus: message.reviewComment.githubStatus,
  })),
}))
jest.mock("@/lib/github-review-publication", () => ({
  GitHubReviewPublicationError: class GitHubReviewPublicationError extends Error {
    constructor(message: string, public status: number) { super(message) }
  },
  publishCommentToGitHub: jest.fn(),
}))
jest.mock("@/lib/prisma", () => ({
  prisma: { collaborationMessage: { findFirst: jest.fn() } },
}))
jest.mock("@/lib/socket/emitter", () => ({ emitCollaborationMessageUpdated: jest.fn() }))

const request = new Request("http://localhost/api/comments/comment-1/github", { method: "POST" })
const context = { params: Promise.resolve({ id: "comment-1" }) }
const findMessage = prisma.collaborationMessage.findFirst as jest.Mock
const publish = publishCommentToGitHub as jest.Mock
const emit = emitCollaborationMessageUpdated as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } })
  publish.mockResolvedValue({ status: "PUBLISHED", url: "https://github.com/review/1" })
  findMessage.mockResolvedValue({
    id: "message-1",
    roomId: "room-1",
    reviewComment: { githubStatus: "PUBLISHED" },
  })
})

it("broadcasts the stored published status to collaborators", async () => {
  const response = await POST(request, context)

  expect(response.status).toBe(200)
  expect(findMessage).toHaveBeenCalledWith({
    where: { authorId: "user-1", reviewComment: { is: { id: "comment-1" } } },
    include: { reviewComment: true },
  })
  expect(emit).toHaveBeenCalledWith({
    id: "message-1", roomId: "room-1", githubStatus: "PUBLISHED",
  })
})

it("broadcasts a stored failure so the recipient can leave the publishing state", async () => {
  publish.mockRejectedValue(new GitHubReviewPublicationError("GitHub rejected review", 422))
  findMessage.mockResolvedValue({
    id: "message-1", roomId: "room-1", reviewComment: { githubStatus: "FAILED" },
  })

  const response = await POST(request, context)

  expect(response.status).toBe(422)
  expect(emit).toHaveBeenCalledWith({
    id: "message-1", roomId: "room-1", githubStatus: "FAILED",
  })
})

it("keeps the publication response successful if socket broadcasting fails", async () => {
  emit.mockRejectedValue(new Error("socket unavailable"))
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {})

  const response = await POST(request, context)

  expect(response.status).toBe(200)
  expect(consoleError).toHaveBeenCalled()
  consoleError.mockRestore()
})
