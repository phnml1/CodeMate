export type PRStatus = "OPEN" | "MERGED" | "CLOSED" | "DRAFT";

export interface PullRequestRepo {
  id: string;
  name: string;
  fullName: string;
}

export interface PullRequest {
  id: string;
  githubId: number;
  number: number;
  title: string;
  description: string;
  status: PRStatus;
  baseBranch: string;
  headBranch: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  repoId: string;
  repo: PullRequestRepo;
  mergedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PullRequestPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PullRequestListResponse {
  pullRequests: PullRequest[];
  pagination: PullRequestPagination;
}
