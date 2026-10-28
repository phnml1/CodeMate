import { Octokit } from "@octokit/rest"
import { analyzeReview } from "@/lib/ai/analyze"
import { getAnthropicClient } from "@/lib/ai/claude"
import { prisma } from "@/lib/prisma"
import { getRepositoryGithubUsers } from "@/lib/repository-access"

jest.mock("@octokit/rest", () => ({ Octokit: jest.fn() }))
jest.mock("@/lib/generated/prisma/client", () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {},
  },
}))
jest.mock("@/lib/ai/claude", () => ({
  CLAUDE_MODEL: "test-model",
  getAnthropicClient: jest.fn(),
}))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    review: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    pullRequest: { findUnique: jest.fn() },
  },
}))
jest.mock("@/lib/repository-access", () => ({
  getRepositoryGithubUsers: jest.fn(),
}))

const mockedOctokit = Octokit as unknown as jest.Mock
const mockedGetAnthropicClient = getAnthropicClient as jest.Mock
const mockedGetRepositoryGithubUsers = getRepositoryGithubUsers as jest.Mock
const mockedReview = prisma.review as unknown as {
  findFirst: jest.Mock
  create: jest.Mock
  update: jest.Mock
}
const mockedFindPullRequest = prisma.pullRequest.findUnique as jest.Mock

const githubUsers = [
  { id: "user-old", name: "Old user", image: null, githubToken: "expired" },
  { id: "user-current", name: "Current user", image: null, githubToken: "valid" },
]

describe("analyzeReview", () => {
  const listFiles = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockedReview.findFirst.mockResolvedValue(null)
    mockedReview.create.mockResolvedValue({ id: "review-1" })
    mockedReview.update.mockResolvedValue({ id: "review-1" })
    mockedFindPullRequest.mockResolvedValue({
      id: "pr-1",
      number: 204,
      title: "AI review",
      description: null,
      baseBranch: "main",
      headBranch: "feature",
      repo: { id: "repo-1", fullName: "owner/repo" },
    })
    mockedGetRepositoryGithubUsers.mockResolvedValue(githubUsers)
    mockedOctokit.mockImplementation(() => ({
      rest: { pulls: { listFiles } },
    }))
    mockedGetAnthropicClient.mockReturnValue({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{
            type: "text",
            text: JSON.stringify({
              issues: [],
              summary: "문제가 없습니다.",
              overallAssessment: "APPROVE",
            }),
          }],
        }),
      },
    })
  })

  it("requests preferred ordering and falls back after a GitHub 401", async () => {
    listFiles
      .mockRejectedValueOnce(Object.assign(new Error("Bad credentials"), { status: 401 }))
      .mockResolvedValueOnce({ data: [{ filename: "app/page.tsx", patch: "+change" }] })
    const warning = jest.spyOn(console, "warn").mockImplementation(() => {})

    const result = await analyzeReview("pr-1", "user-current")

    expect(result).toEqual({ status: "COMPLETED" })
    expect(mockedGetRepositoryGithubUsers).toHaveBeenCalledWith(
      "repo-1",
      "user-current"
    )
    expect(mockedOctokit).toHaveBeenNthCalledWith(1, { auth: "expired" })
    expect(mockedOctokit).toHaveBeenNthCalledWith(2, { auth: "valid" })
    expect(listFiles).toHaveBeenCalledTimes(2)
    expect(mockedReview.update).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "COMPLETED", stage: "COMPLETED" }),
    }))
    warning.mockRestore()
  })

  it("stores a useful failure reason when every connected token is invalid", async () => {
    listFiles.mockRejectedValue(
      Object.assign(new Error("Bad credentials"), { status: 401 })
    )
    const warning = jest.spyOn(console, "warn").mockImplementation(() => {})
    const error = jest.spyOn(console, "error").mockImplementation(() => {})

    const result = await analyzeReview("pr-1")

    expect(result).toEqual({ status: "FAILED" })
    expect(listFiles).toHaveBeenCalledTimes(2)
    expect(mockedReview.update).toHaveBeenLastCalledWith({
      where: { id: "review-1" },
      data: {
        status: "FAILED",
        stage: "FAILED",
        failureReason: "GitHub 인증이 만료되었습니다. GitHub 계정을 다시 연결해 주세요.",
      },
    })
    warning.mockRestore()
    error.mockRestore()
  })
})
