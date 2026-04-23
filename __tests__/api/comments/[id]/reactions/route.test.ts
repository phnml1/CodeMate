import { POST } from "@/app/api/comments/[id]/reactions/route"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { emitCommentReactionUpdated } from "@/lib/socket/emitter"

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    comment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock("@/lib/socket/emitter", () => ({
  emitCommentReactionUpdated: jest.fn(),
}))

const mockedAuth = auth as jest.Mock
const mockedFindUnique = prisma.comment.findUnique as jest.Mock
const mockedUpdate = prisma.comment.update as jest.Mock
const mockedEmitCommentReactionUpdated = emitCommentReactionUpdated as jest.Mock

function createRequest(body: object) {
  return new Request("http://localhost/api/comments/comment-1/reactions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

function createParams(id = "comment-1") {
  return Promise.resolve({ id })
}

describe("POST /api/comments/[id]/reactions", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("returns 401 for anonymous users", async () => {
    mockedAuth.mockResolvedValue(null)

    const response = await POST(createRequest({ emoji: "👍" }), {
      params: createParams(),
    })
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
  })

  it("returns 404 when the comment does not exist", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindUnique.mockResolvedValue(null)

    const response = await POST(createRequest({ emoji: "👍" }), {
      params: createParams(),
    })
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBeDefined()
  })

  it("returns 400 for unsupported emoji", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindUnique.mockResolvedValue({
      id: "comment-1",
      pullRequestId: "pr-1",
      reactions: {},
    })

    const response = await POST(createRequest({ emoji: "🔥" }), {
      params: createParams(),
    })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBeDefined()
    expect(mockedUpdate).not.toHaveBeenCalled()
    expect(mockedEmitCommentReactionUpdated).not.toHaveBeenCalled()
  })

  it("adds a reaction and emits a realtime update", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindUnique.mockResolvedValue({
      id: "comment-1",
      pullRequestId: "pr-1",
      reactions: { "👍": ["user-2"] },
    })
    mockedUpdate.mockResolvedValue({
      id: "comment-1",
      pullRequestId: "pr-1",
      reactions: { "👍": ["user-2", "user-1"] },
      author: { id: "user-1", name: "Tester", image: null },
    })

    const response = await POST(createRequest({ emoji: "👍" }), {
      params: createParams(),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: "comment-1" },
      data: { reactions: { "👍": ["user-2", "user-1"] } },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    })
    expect(mockedEmitCommentReactionUpdated).toHaveBeenCalledWith(
      "pr-1",
      "comment-1",
      { "👍": ["user-2", "user-1"] }
    )
    expect(body.comment.reactions["👍"]).toEqual(["user-2", "user-1"])
  })

  it("removes the user's existing reaction and emits the trimmed payload", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockedFindUnique.mockResolvedValue({
      id: "comment-1",
      pullRequestId: "pr-1",
      reactions: { "👍": ["user-1", "user-2"] },
    })
    mockedUpdate.mockResolvedValue({
      id: "comment-1",
      pullRequestId: "pr-1",
      reactions: { "👍": ["user-2"] },
      author: { id: "user-1", name: "Tester", image: null },
    })

    const response = await POST(createRequest({ emoji: "👍" }), {
      params: createParams(),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: "comment-1" },
      data: { reactions: { "👍": ["user-2"] } },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    })
    expect(mockedEmitCommentReactionUpdated).toHaveBeenCalledWith(
      "pr-1",
      "comment-1",
      { "👍": ["user-2"] }
    )
    expect(body.comment.reactions["👍"]).toEqual(["user-2"])
  })
})
