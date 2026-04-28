"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, FileText, Clock } from "lucide-react";
import { timeAgo } from "@/lib/date";
import { PR_STATUS_STYLE } from "@/constants/pulls";
import { SocketConnectionBadge } from "@/components/realtime/SocketConnectionStatus";
import { useCachedPRDetail } from "@/hooks/pr-detail/usePRDetailCachedQueries";
import BranchChip from "./BranchChip";

interface PRDetailHeaderProps {
  prId: string;
  scrolled?: boolean;
}

export default function PRDetailHeader({ prId, scrolled = false }: PRDetailHeaderProps) {
  const router = useRouter();
  const { data: pr } = useCachedPRDetail(prId);

  if (!pr) return null;

  return (
    <div
      className={`bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-all duration-200 ${
        scrolled ? "px-3 py-2 md:px-6 md:py-2.5" : "p-4 md:p-6 space-y-4"
      }`}
    >
      {scrolled ? (
        /* ── Compact mode ── */
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => router.back()}
            aria-label="PR 목록으로 돌아가기"
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors shrink-0"
          >
            <ChevronLeft size={16} />
          </button>

          <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider shrink-0 ${PR_STATUS_STYLE[pr.status]}`}>
            {pr.status}
          </span>

          <SocketConnectionBadge className="hidden md:inline-flex" />

          <h1 className="text-xs md:text-sm font-bold text-slate-900 dark:text-white truncate flex-1 min-w-0">
            {pr.title}
          </h1>

          <span className="text-[10px] text-slate-400 font-mono shrink-0 hidden sm:block">
            #{pr.number}
          </span>

          <div className="hidden md:flex items-center gap-1 text-[10px] font-bold shrink-0">
            <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-100 dark:border-emerald-500/20">
              +{pr.additions}
            </span>
            <span className="px-1.5 py-0.5 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-full border border-rose-100 dark:border-rose-500/20">
              -{pr.deletions}
            </span>
          </div>
        </div>
      ) : (
        /* ── Expanded mode ── */
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">

          {/* 좌측: 타이틀 + 브랜치 정보 */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
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
              <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${PR_STATUS_STYLE[pr.status]}`}>
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
              <SocketConnectionBadge className="hidden md:inline-flex" />
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
      )}
    </div>
  );
}
