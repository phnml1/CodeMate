import { getOctokit } from "@/lib/github";
import { prisma } from "@/lib/prisma";
import {
  buildAccessiblePullRequestWhere,
  getRepositoryPrimaryUser,
} from "@/lib/repository-access";
import type { PullRequest } from "@/types/pulls";

function serializeDate(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

export async function getPullRequestDetailForUser(
  id: string,
  userId: string
): Promise<PullRequest | null> {
  const pullRequestWhere = await buildAccessiblePullRequestWhere(userId);

  const pr = await prisma.pullRequest.findFirst({
    where: {
      id,
      ...pullRequestWhere,
    },
    include: {
      repo: {
        select: {
          id: true,
          name: true,
          fullName: true,
        },
      },
      reviews: {
        select: {
          id: true,
          status: true,
          qualityScore: true,
          issueCount: true,
          severity: true,
          reviewedAt: true,
        },
        take: 1,
        orderBy: { reviewedAt: "desc" },
      },
    },
  });

  if (!pr) {
    return null;
  }

  const owner = await getRepositoryPrimaryUser(pr.repo.id);
  let { additions, deletions, changedFiles } = pr;

  if (additions === 0 && deletions === 0 && changedFiles === 0) {
    try {
      const octokit = await getOctokit(userId);
      const [ownerName, repoName] = pr.repo.fullName.split("/");
      const { data } = await octokit.pulls.get({
        owner: ownerName,
        repo: repoName,
        pull_number: pr.number,
      });

      additions = data.additions;
      deletions = data.deletions;
      changedFiles = data.changed_files;

      prisma.pullRequest
        .update({
          where: { id },
          data: { additions, deletions, changedFiles },
        })
        .catch(() => {});
    } catch {
      // Keep stored values when GitHub hydration fails.
    }
  }

  return {
    id: pr.id,
    githubId: Number(pr.githubId),
    number: pr.number,
    title: pr.title,
    description: pr.description ?? "",
    status: pr.status,
    baseBranch: pr.baseBranch,
    headBranch: pr.headBranch,
    additions,
    deletions,
    changedFiles,
    repoId: pr.repoId,
    repo: {
      id: pr.repo.id,
      name: pr.repo.name,
      fullName: pr.repo.fullName,
      owner,
    },
    mergedAt: serializeDate(pr.mergedAt),
    closedAt: serializeDate(pr.closedAt),
    githubCreatedAt: serializeDate(pr.githubCreatedAt),
    githubUpdatedAt: serializeDate(pr.githubUpdatedAt),
    createdAt: pr.createdAt.toISOString(),
    updatedAt: pr.updatedAt.toISOString(),
    reviews: pr.reviews.map((review) => ({
      ...review,
      reviewedAt: serializeDate(review.reviewedAt),
    })),
  };
}
