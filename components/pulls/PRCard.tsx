import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PullRequest } from "@/types/pulls";

import PRCardMeta, { type PRCardAuthor } from "./PRCardMeta";
import PRStatusBadge from "./PRStatusBadge";

interface PRCardProps extends PullRequest {
  /** API에 author 필드가 추가될 때까지 optional */
  author?: PRCardAuthor;
  animationDelay?: number;
}

export default function PRCard({
  id,
  number,
  title,
  status,
  repo,
  author,
  githubCreatedAt,
  createdAt,
  animationDelay = 0,
}: PRCardProps) {
  const relativeTime = formatDistanceToNow(new Date(githubCreatedAt ?? createdAt), {
    addSuffix: true,
    locale: ko,
  });

  return (
    <Card
      className={cn(
        "group relative rounded-[24px] p-4 md:p-5 border-slate-200 shadow-none",
        "hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5",
        "transition-all duration-300 cursor-pointer",
        "animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <Link href={`/pulls/${id}`} className="absolute inset-0 z-0 rounded-[24px]" aria-label={title} />

      <div className="flex flex-col gap-3 h-full">
        {/* Header: Status badge + PR number */}
        <div className="flex items-center gap-2 sm:gap-3">
          <PRStatusBadge status={status} />
          <span className="text-slate-400 font-mono text-xs sm:text-sm">
            #{number}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors tracking-tight leading-snug">
          {title}
        </h3>

        {/* Meta info (without time) */}
        <PRCardMeta
          repoName={repo.name}
          author={author}
          hideTime
        />

        {/* Bottom section: Time + Action button */}
        <div className="flex items-center justify-between gap-3 mt-auto pt-2">
          <span className="text-slate-400 italic text-[10px] sm:text-xs">
            {relativeTime}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="relative z-10 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 text-blue-700 rounded-lg text-xs sm:text-sm font-semibold hover:bg-blue-100 border border-blue-200 h-auto whitespace-nowrap transition-colors"
            asChild
          >
            <Link href={`/pulls/${id}`}>리뷰하기</Link>
          </Button>
        </div>
      </div>

      {/* Left border hover indicator */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 group-hover:h-12 bg-blue-600 rounded-r-full transition-all duration-300" />
    </Card>
  );
}
