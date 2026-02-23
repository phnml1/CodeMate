import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PullRequest } from "@/types/pulls";

import PRCardMeta, { type PRCardAuthor } from "./PRCardMeta";
import PRCardStats from "./PRCardStats";
import PRStatusBadge from "./PRStatusBadge";

interface PRCardProps extends PullRequest {
  /** API에 author 필드가 추가될 때까지 optional */
  author?: PRCardAuthor;
  animationDelay?: number;
}

export default function PRCard({
  number,
  title,
  status,
  repo,
  author,
  createdAt,
  additions,
  deletions,
  animationDelay = 0,
}: PRCardProps) {
  const relativeTime = formatDistanceToNow(new Date(createdAt), {
    addSuffix: true,
    locale: ko,
  });

  return (
    <Card
      className={cn(
        "group relative rounded-[24px] p-6 md:p-8 border-slate-200 shadow-none gap-0",
        "hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5",
        "transition-all duration-300 cursor-pointer",
        "animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
        {/* Left: PR info */}
        <div className="flex-1 min-w-0 space-y-2 sm:space-y-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <PRStatusBadge status={status} />
            <span className="text-slate-400 font-mono text-xs sm:text-sm">
              #{number}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors tracking-tight leading-tight">
            {title}
          </h3>

          <PRCardMeta
            repoName={repo.name}
            author={author}
            relativeTime={relativeTime}
          />
        </div>

        {/* Right: Stats + Review button */}
        <div className="flex items-center justify-between lg:justify-end gap-4 sm:gap-8 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-50">
          <PRCardStats additions={additions} deletions={deletions} />

          <Button
            variant="ghost"
            size="sm"
            className="px-4 sm:px-5 py-2 sm:py-2.5 bg-slate-50 text-slate-600 rounded-xl text-xs sm:text-sm font-bold hover:bg-blue-50 hover:text-blue-700 border border-transparent hover:border-blue-100 h-auto whitespace-nowrap"
          >
            리뷰하기
          </Button>
        </div>
      </div>

      {/* Left border hover indicator */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 group-hover:h-12 bg-blue-600 rounded-r-full transition-all duration-300" />
    </Card>
  );
}
