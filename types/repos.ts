export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  language: string | null;
  isConnected: boolean;
  repositoryId?: string;
}

export interface RepoPagination {
  page: number;
  perPage: number;
  hasNextPage: boolean;
}

export interface RepoListResponse {
  repos: GitHubRepo[];
  pagination: RepoPagination;
}
