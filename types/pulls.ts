export type PRStatus = "OPEN" | "MERGED" | "CLOSED" | "DRAFT";

export interface PullRequestRepo {
  id: string;
  name: string;
  fullName: string;
  owner: { id: string; name: string | null; image: string | null } | null;
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
  githubCreatedAt: string | null;
  githubUpdatedAt: string | null;
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

export type PRFileStatus =
  | "added"
  | "modified"
  | "removed"
  | "renamed"
  | "copied"
  | "changed"
  | "unchanged";

export interface PRFile {
  filename: string;
  status: PRFileStatus;
  additions: number;
  deletions: number;
  changes: number;
  patch: string | null;
}

export interface PRFilesResponse {
  files: PRFile[];
}
