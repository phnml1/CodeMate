import type { Octokit } from "@octokit/rest"

import { prisma } from "@/lib/prisma"

type GitHubPullRequestSummary =
  Awaited<ReturnType<Octokit["rest"]["pulls"]["list"]>>["data"][number]
type GitHubPullRequestDetail =
  Awaited<ReturnType<Octokit["rest"]["pulls"]["get"]>>["data"]

interface SyncRepositoryPullRequestsParams {
  octokit: Octokit
  owner: string
  repo: string
  repositoryId: string
}

export interface SyncRepositoryPullRequestsResult {
  syncedCount: number
  detailHydratedCount: number
}

const PR_WRITE_BATCH_SIZE = 25
const PR_DETAIL_FETCH_BATCH_SIZE = 5

export function getPullRequestStatus(pr: {
  state: string
  draft?: boolean | null
  merged?: boolean | null
  merged_at?: string | null
}): "OPEN" | "CLOSED" | "MERGED" | "DRAFT" {
  if (pr.draft) return "DRAFT"

  if (pr.state === "closed") {
    return pr.merged || Boolean(pr.merged_at) ? "MERGED" : "CLOSED"
  }

  return "OPEN"
}

async function mapInBatches<T, Result>(
  items: T[],
  batchSize: number,
  handler: (item: T) => Promise<Result>
): Promise<Result[]> {
  const results: Result[] = []

  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize)
    results.push(...(await Promise.all(batch.map(handler))))
  }

  return results
}

function getNeedsDetailHydration(
  localPullRequest:
    | {
        additions: number
        deletions: number
        changedFiles: number
        githubUpdatedAt: Date | null
      }
    | undefined,
  remotePullRequest: GitHubPullRequestSummary
): boolean {
  if (!localPullRequest) {
    return true
  }

  if (
    localPullRequest.additions === 0 &&
    localPullRequest.deletions === 0 &&
    localPullRequest.changedFiles === 0
  ) {
    return true
  }

  if (!remotePullRequest.updated_at) {
    return false
  }

  if (!localPullRequest.githubUpdatedAt) {
    return true
  }

  return (
    new Date(remotePullRequest.updated_at).getTime() >
    localPullRequest.githubUpdatedAt.getTime()
  )
}

function toUpsertPayload(
  pullRequest: GitHubPullRequestSummary | GitHubPullRequestDetail,
  repositoryId: string
) {
  return {
    githubId: BigInt(pullRequest.id),
    number: pullRequest.number,
    title: pullRequest.title,
    description: pullRequest.body ?? null,
    status: getPullRequestStatus(pullRequest),
    baseBranch: pullRequest.base.ref,
    headBranch: pullRequest.head.ref,
    additions: "additions" in pullRequest ? (pullRequest.additions ?? 0) : 0,
    deletions: "deletions" in pullRequest ? (pullRequest.deletions ?? 0) : 0,
    changedFiles:
      "changed_files" in pullRequest ? (pullRequest.changed_files ?? 0) : 0,
    mergedAt: pullRequest.merged_at ? new Date(pullRequest.merged_at) : null,
    closedAt: pullRequest.closed_at ? new Date(pullRequest.closed_at) : null,
    githubCreatedAt: pullRequest.created_at
      ? new Date(pullRequest.created_at)
      : null,
    githubUpdatedAt: pullRequest.updated_at
      ? new Date(pullRequest.updated_at)
      : null,
    repoId: repositoryId,
  }
}

export async function syncRepositoryPullRequests({
  octokit,
  owner,
  repo,
  repositoryId,
}: SyncRepositoryPullRequestsParams): Promise<SyncRepositoryPullRequestsResult> {
  const remotePullRequests = await octokit.paginate(octokit.rest.pulls.list, {
    owner,
    repo,
    state: "all",
    per_page: 100,
    sort: "updated",
    direction: "desc",
  })

  if (remotePullRequests.length === 0) {
    return {
      syncedCount: 0,
      detailHydratedCount: 0,
    }
  }

  const existingPullRequests = await prisma.pullRequest.findMany({
    where: {
      repoId: repositoryId,
      number: {
        in: remotePullRequests.map((pullRequest) => pullRequest.number),
      },
    },
    select: {
      id: true,
      number: true,
      additions: true,
      deletions: true,
      changedFiles: true,
      githubUpdatedAt: true,
    },
  })

  const existingByNumber = new Map(
    existingPullRequests.map((pullRequest) => [pullRequest.number, pullRequest])
  )

  const pullRequestsToHydrate = remotePullRequests.filter((pullRequest) =>
    getNeedsDetailHydration(existingByNumber.get(pullRequest.number), pullRequest)
  )

  const syncedPullRequests = await mapInBatches(
    remotePullRequests,
    PR_WRITE_BATCH_SIZE,
    (pullRequest) =>
      prisma.pullRequest.upsert({
        where: { githubId: BigInt(pullRequest.id) },
        update: {
          title: pullRequest.title,
          description: pullRequest.body ?? null,
          status: getPullRequestStatus(pullRequest),
          baseBranch: pullRequest.base.ref,
          headBranch: pullRequest.head.ref,
          mergedAt: pullRequest.merged_at ? new Date(pullRequest.merged_at) : null,
          closedAt: pullRequest.closed_at ? new Date(pullRequest.closed_at) : null,
          githubCreatedAt: pullRequest.created_at
            ? new Date(pullRequest.created_at)
            : null,
          githubUpdatedAt: pullRequest.updated_at
            ? new Date(pullRequest.updated_at)
            : null,
        },
        create: toUpsertPayload(pullRequest, repositoryId),
      })
  )

  const syncedByNumber = new Map(
    syncedPullRequests.map((pullRequest) => [pullRequest.number, pullRequest.id])
  )

  const hydratedResults = await mapInBatches(
    pullRequestsToHydrate,
    PR_DETAIL_FETCH_BATCH_SIZE,
    async (pullRequest) => {
      try {
        const { data } = await octokit.rest.pulls.get({
          owner,
          repo,
          pull_number: pullRequest.number,
        })

        const localId = syncedByNumber.get(pullRequest.number)

        if (!localId) {
          return null
        }

        return {
          id: localId,
          additions: data.additions ?? 0,
          deletions: data.deletions ?? 0,
          changedFiles: data.changed_files ?? 0,
        }
      } catch {
        // Continue syncing other PRs when one detail request fails.
        return null
      }
    }
  )

  const validHydratedResults = hydratedResults.filter((result) => result !== null)

  if (validHydratedResults.length > 0) {
    await mapInBatches(
      validHydratedResults,
      PR_WRITE_BATCH_SIZE,
      (result) =>
        prisma.pullRequest.update({
          where: { id: result.id },
          data: {
            additions: result.additions,
            deletions: result.deletions,
            changedFiles: result.changedFiles,
          },
        })
    )
  }

  return {
    syncedCount: remotePullRequests.length,
    detailHydratedCount: validHydratedResults.length,
  }
}
