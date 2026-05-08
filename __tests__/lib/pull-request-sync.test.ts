import { prisma } from "@/lib/prisma"
import { syncRepositoryPullRequests } from "@/lib/pull-request-sync"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    pullRequest: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  },
}))

const mockedTransaction = prisma.$transaction as jest.Mock
const mockedFindMany = prisma.pullRequest.findMany as jest.Mock
const mockedUpsert = prisma.pullRequest.upsert as jest.Mock
const mockedUpdate = prisma.pullRequest.update as jest.Mock

function createPullRequest(number: number, overrides: Record<string, unknown> = {}) {
  return {
    id: number,
    number,
    title: `PR ${number}`,
    body: null,
    state: "open",
    draft: false,
    merged_at: null,
    closed_at: null,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-02T00:00:00Z",
    base: { ref: "main" },
    head: { ref: `feature-${number}` },
    ...overrides,
  }
}

describe("syncRepositoryPullRequests", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("syncs pull requests without wrapping the full write set in a transaction", async () => {
    const remotePullRequests = [createPullRequest(1), createPullRequest(2)]
    const octokit = {
      paginate: jest.fn().mockResolvedValue(remotePullRequests),
      rest: {
        pulls: {
          list: jest.fn(),
          get: jest.fn(({ pull_number }) =>
            Promise.resolve({
              data: createPullRequest(pull_number, {
                additions: 12,
                deletions: 3,
                changed_files: 2,
              }),
            })
          ),
        },
      },
    }

    mockedFindMany.mockResolvedValue([])
    mockedUpsert.mockImplementation(({ create }) =>
      Promise.resolve({ id: `local-pr-${create.number}`, number: create.number })
    )
    mockedUpdate.mockResolvedValue({})

    const result = await syncRepositoryPullRequests({
      octokit: octokit as never,
      owner: "owner",
      repo: "repo",
      repositoryId: "repo-1",
    })

    expect(result).toEqual({
      syncedCount: 2,
      detailHydratedCount: 2,
    })
    expect(mockedTransaction).not.toHaveBeenCalled()
    expect(mockedUpsert).toHaveBeenCalledTimes(2)
    expect(octokit.rest.pulls.get).toHaveBeenCalledTimes(2)
    expect(mockedUpdate).toHaveBeenCalledTimes(2)
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: "local-pr-1" },
      data: {
        additions: 12,
        deletions: 3,
        changedFiles: 2,
      },
    })
  })
})
