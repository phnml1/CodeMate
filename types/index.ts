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

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  status: 'OPEN' | 'CLOSED' | 'MERGED';
  createdAt: Date;
}

export interface Review {
  id: string;
  qualityScore: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  issueCount: number;
  aiSuggestions: any;
}