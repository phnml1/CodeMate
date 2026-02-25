export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  githubId?: number;
}

export interface Repository {
  id: string;
  githubId: number;
  name: string;
  fullName: string;
  language?: string;
  isActive: boolean;
}

export type { PRStatus, PullRequestRepo, PullRequest, PullRequestListResponse } from "./pulls";
export type { GitHubRepo, RepoPagination, RepoListResponse } from "./repos";

export interface Review {
  id: string;
  qualityScore: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  issueCount: number;
  aiSuggestions: Record<string, unknown>;
}