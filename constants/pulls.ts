import type { PRStatus, PRFileStatus, PullRequest } from "@/types/pulls";

/** PRStatusFilter 탭에서 사용하는 UI 전용 필터 타입 */
export type PRFilterTab = "All" | "Open" | "Merged" | "Closed" | "Draft";

/** PRStatusFilter 탭 목록 */
export const PR_STATUS_TABS: PRFilterTab[] = [
  "All",
  "Open",
  "Merged",
  "Closed",
  "Draft",
];

/** UI 필터 탭 → API status 변환 (All은 undefined → 필터 없음) */
export const FILTER_TAB_TO_STATUS: Partial<Record<PRFilterTab, PRStatus>> = {
  Open: "OPEN",
  Merged: "MERGED",
  Closed: "CLOSED",
  Draft: "DRAFT",
};

/** PRDetailHeader 상태 뱃지 스타일 */
export const PR_STATUS_STYLE: Record<PRStatus, string> = {
  OPEN:   "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  MERGED: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
  CLOSED: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
  DRAFT:  "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
};

/** PRFileList 파일 상태 뱃지 */
export const PR_FILE_STATUS_BADGE: Record<PRFileStatus, { label: string; className: string }> = {
  added:     { label: "A", className: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30" },
  modified:  { label: "M", className: "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30" },
  removed:   { label: "D", className: "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30" },
  renamed:   { label: "R", className: "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30" },
  copied:    { label: "C", className: "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30" },
  changed:   { label: "M", className: "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30" },
  unchanged: { label: "U", className: "bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/30" },
};

/** PRStatusBadge 스타일 매핑 */
export const PR_STATUS_CONFIG: Record<
  PRStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  OPEN: {
    label: "Open",
    badgeClass: "bg-emerald-50 border border-emerald-100 text-emerald-600",
    dotClass: "bg-emerald-500 animate-pulse",
  },
  MERGED: {
    label: "Merged",
    badgeClass: "bg-purple-50 border border-purple-100 text-purple-600",
    dotClass: "bg-purple-500 animate-pulse",
  },
  CLOSED: {
    label: "Closed",
    badgeClass: "bg-rose-50 border border-rose-100 text-rose-600",
    dotClass: "bg-rose-500 animate-pulse",
  },
  DRAFT: {
    label: "Draft",
    badgeClass: "bg-slate-50 border border-slate-200 text-slate-500",
    dotClass: "bg-slate-400",
  },
};

/** PR 목업 데이터 */
export const MOCK_PRS: PullRequest[] = [
  {
    id: "pr_1",
    githubId: 1001,
    number: 45,
    title: "feat: Implement real-time monitoring",
    description: "",
    status: "OPEN",
    baseBranch: "main",
    headBranch: "feat/real-time-monitoring",
    additions: 142,
    deletions: 12,
    changedFiles: 8,
    repoId: "repo_1",
    repo: { id: "repo_1", name: "awesome-app", fullName: "myorg/awesome-app", owner: { id: "user_1", name: "Owner", image: null } },
    mergedAt: null,
    closedAt: null,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "pr_2",
    githubId: 1000,
    number: 44,
    title: "fix: Resolve authentication edge case on token refresh",
    description: "",
    status: "MERGED",
    baseBranch: "main",
    headBranch: "fix/auth-token-refresh",
    additions: 38,
    deletions: 5,
    changedFiles: 3,
    repoId: "repo_1",
    repo: { id: "repo_1", name: "awesome-app", fullName: "myorg/awesome-app", owner: { id: "user_1", name: "Owner", image: null } },
    mergedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    closedAt: null,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "pr_3",
    githubId: 999,
    number: 43,
    title: "chore: Update dependencies and fix security vulnerabilities",
    description: "",
    status: "CLOSED",
    baseBranch: "main",
    headBranch: "chore/update-deps",
    additions: 12,
    deletions: 87,
    changedFiles: 5,
    repoId: "repo_2",
    repo: { id: "repo_2", name: "backend-api", fullName: "myorg/backend-api", owner: { id: "user_1", name: "Owner", image: null } },
    mergedAt: null,
    closedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "pr_4",
    githubId: 998,
    number: 42,
    title: "feat: Add dark mode support across all components",
    description: "",
    status: "DRAFT",
    baseBranch: "main",
    headBranch: "feat/dark-mode",
    additions: 231,
    deletions: 0,
    changedFiles: 24,
    repoId: "repo_3",
    repo: { id: "repo_3", name: "frontend-ui", fullName: "myorg/frontend-ui", owner: { id: "user_1", name: "Owner", image: null } },
    mergedAt: null,
    closedAt: null,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];
