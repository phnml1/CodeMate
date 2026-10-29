import { publishCommentToGitHub } from "@/lib/github-review-publication"
import { getOctokit } from "@/lib/github"
import { prisma } from "@/lib/prisma"
import { isRepositoryAccessibleToUser } from "@/lib/repository-access"

jest.mock("@/lib/prisma", () => ({
  prisma: { comment: { findFirst: jest.fn(), updateMany: jest.fn(), update: jest.fn() }, review: { findFirst: jest.fn() } },
}))
jest.mock("@/lib/github", () => ({
  getOctokit: jest.fn(),
  GitHubReconnectRequiredError: class GitHubReconnectRequiredError extends Error {},
}))
jest.mock("@/lib/repository-access", () => ({ isRepositoryAccessibleToUser: jest.fn() }))

const findComment = prisma.comment.findFirst as jest.Mock
const claimComment = prisma.comment.updateMany as jest.Mock
const updateComment = prisma.comment.update as jest.Mock
const mockedOctokit = getOctokit as jest.Mock
const canAccess = isRepositoryAccessibleToUser as jest.Mock

const reviewComment = {
  id: "comment-1",
  authorId: "user-1",
  content: "이 조건을 확인해 주세요.",
  filePath: "src/example.ts",
  lineNumber: 2,
  githubStatus: "NOT_REQUESTED",
  pullRequest: { number: 7, repoId: "repo-1", repo: { fullName: "owner/repo" } },
  collaborationMessage: null,
}

const listReviews = jest.fn()
const listFiles = jest.fn()
const createReview = jest.fn()
const listCommentsForReview = jest.fn()
const getPull = jest.fn()
const paginate = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  findComment.mockResolvedValue(reviewComment)
  canAccess.mockResolvedValue(true)
  claimComment.mockResolvedValue({ count: 1 })
  updateComment.mockResolvedValue({})
  mockedOctokit.mockResolvedValue({
    paginate,
    rest: { pulls: { listReviews, listFiles, createReview, listCommentsForReview, get: getPull } },
  })
  paginate.mockImplementation((method) => method === listReviews
    ? []
    : [{ filename: "src/example.ts", patch: "@@ -1,2 +1,2 @@\n context\n-old\n+new" }])
  getPull.mockResolvedValue({ data: { head: { sha: "head-1" } } })
  createReview.mockResolvedValue({ data: { id: 123, html_url: "https://github.com/owner/repo/pull/7#pullrequestreview-123" } })
  listCommentsForReview.mockResolvedValue({ data: [{ id: 789 }] })
})

it("publishes the local line as a GitHub PR review and stores its link", async () => {
  const result = await publishCommentToGitHub("comment-1", "user-1")

  expect(createReview).toHaveBeenCalledWith(expect.objectContaining({
    event: "COMMENT",
    commit_id: "head-1",
    comments: [{ path: "src/example.ts", line: 2, side: "RIGHT", body: reviewComment.content }],
  }))
  expect(updateComment).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ githubStatus: "PUBLISHED", githubReviewId: "123", githubReviewCommentId: "789" }),
  }))
  expect(result.status).toBe("PUBLISHED")
})

it("publishes a review without a code line as the GitHub PR review body", async () => {
  findComment.mockResolvedValue({ ...reviewComment, filePath: null, lineNumber: null })
  listCommentsForReview.mockResolvedValue({ data: [] })

  const result = await publishCommentToGitHub("comment-1", "user-1")

  expect(createReview).toHaveBeenCalledWith({
    owner: "owner",
    repo: "repo",
    pull_number: 7,
    event: "COMMENT",
    body: `${reviewComment.content}\n\n<!-- codemate-review:comment-1 -->`,
  })
  expect(getPull).not.toHaveBeenCalled()
  expect(updateComment).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ githubStatus: "PUBLISHED", githubReviewId: "123", githubReviewCommentId: null }),
  }))
  expect(result.status).toBe("PUBLISHED")
})

it("recovers an already posted review without creating a duplicate", async () => {
  findComment.mockResolvedValue({ ...reviewComment, githubStatus: "FAILED" })
  paginate.mockImplementation((method) => method === listReviews
    ? [{ id: 456, body: "<!-- codemate-review:comment-1 -->", html_url: "https://github.com/review/456" }]
    : [])

  await publishCommentToGitHub("comment-1", "user-1")

  expect(createReview).not.toHaveBeenCalled()
  expect(updateComment).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ githubReviewId: "456", githubStatus: "PUBLISHED" }),
  }))
})

it("rejects a stale collaboration anchor and leaves a retryable failure", async () => {
  findComment.mockResolvedValue({
    ...reviewComment,
    collaborationMessage: { codeReference: { filePath: "src/example.ts", side: "RIGHT", startLine: 2, endLine: 2, headSha: "old-head" } },
  })

  await expect(publishCommentToGitHub("comment-1", "user-1")).rejects.toMatchObject({ status: 422 })

  expect(createReview).not.toHaveBeenCalled()
  expect(updateComment).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ githubStatus: "FAILED" }),
  }))
})

it("maps a selected AI issue discussion to its code line", async () => {
  findComment.mockResolvedValue({
    ...reviewComment,
    filePath: null,
    lineNumber: null,
    pullRequestId: "pr-1",
    collaborationMessage: { codeReference: null, reviewReference: { reviewId: "review-1", issueIndex: 0 } },
  })
  ;(prisma.review.findFirst as jest.Mock).mockResolvedValue({
    aiSuggestions: { issues: [{ filePath: "src/example.ts", lineNumber: 2 }] },
  })

  await publishCommentToGitHub("comment-1", "user-1")

  expect(createReview).toHaveBeenCalledWith(expect.objectContaining({
    comments: [{ path: "src/example.ts", line: 2, side: "RIGHT", body: reviewComment.content }],
  }))
})

it("refuses to publish when the author no longer has repository access", async () => {
  canAccess.mockResolvedValue(false)

  await expect(publishCommentToGitHub("comment-1", "user-1")).rejects.toMatchObject({ status: 403 })

  expect(claimComment).not.toHaveBeenCalled()
  expect(createReview).not.toHaveBeenCalled()
})

it("explains GitHub App installation permission failures", async () => {
  createReview.mockRejectedValue({
    status: 403,
    response: { data: { message: "Resource not accessible by integration" } },
  })

  await expect(publishCommentToGitHub("comment-1", "user-1")).rejects.toThrow(
    "GitHub App을 이 저장소에 설치하고 Pull requests 권한을 Read and write로 승인해 주세요."
  )
  expect(updateComment).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ githubStatus: "FAILED", githubError: expect.stringContaining("GitHub App") }),
  }))
})
