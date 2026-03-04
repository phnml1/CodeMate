"use client";

import { ChevronLeft, GitBranch, FileText, Clock } from "lucide-react";
import type { PullRequest, PRStatus } from "@/types/pulls";

interface PRDetailHeaderProps {
  pr: PullRequest;
  onBack?: () => void;
}

const STATUS_STYLE: Record<PRStatus, string> = {
  OPEN:   "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  MERGED: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
  CLOSED: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
  DRAFT:  "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function BranchChip({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md font-mono text-[10px] md:text-xs font-bold text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700">
      <GitBranch size={12} />
      {name}
    </div>
  );
}

export default function PRDetailHeader({ pr, onBack }: PRDetailHeaderProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">

        {/* 좌측: 타이틀 + 브랜치 정보 */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              aria-label="PR 목록으로 돌아가기"
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex flex-wrap items-baseline gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight break-all">
                {pr.title}
              </h1>
              <span className="text-lg md:text-2xl font-light text-slate-400">
                #{pr.number}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3 text-sm">
            <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${STATUS_STYLE[pr.status]}`}>
              {pr.status}
            </span>
            <div className="flex flex-wrap items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
              <span className="font-bold text-slate-900 dark:text-slate-200">{pr.repo.name}</span>
              <span className="hidden sm:inline">wants to merge into</span>
              <BranchChip name={pr.baseBranch} />
              <span className="hidden sm:inline">from</span>
              <BranchChip name={pr.headBranch} />
            </div>
          </div>
        </div>

        {/* 우측: 통계 + 시간 */}
        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold">
            <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-100 dark:border-emerald-500/20">
              +{pr.additions}
            </span>
            <span className="px-2 py-1 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-full border border-rose-100 dark:border-rose-500/20">
              -{pr.deletions}
            </span>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full border border-slate-100 dark:border-slate-700">
              <FileText size={14} />
              {pr.changedFiles} files
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-slate-400 font-medium">
            <Clock size={12} />
            {timeAgo(pr.createdAt)}
          </div>
        </div>

      </div>
    </div>
  );
}
