"use client"

import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import { MessageSquare, GitPullRequest, FileCode } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { CommentWithPR } from "@/types/comment"

interface CommentCardProps {
  comment: CommentWithPR
  onClick: (comment: CommentWithPR) => void
  animationDelay?: number
}

export default function CommentCard({ comment, onClick, animationDelay = 0 }: CommentCardProps) {
  const relativeTime = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
    locale: ko,
  })

  return (
    <Card
      onClick={() => onClick(comment)}
      className={cn(
        "group relative rounded-[24px] p-4 md:p-5 border-slate-200 shadow-none cursor-pointer",
        "hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5",
        "transition-all duration-300",
        "animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex flex-col gap-3">
        {/* Header: 작성자 + PR 배지 */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {comment.author.image ? (
              <Image
                src={comment.author.image}
                alt={comment.author.name ?? ""}
                width={24}
                height={24}
                className="rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-500 font-bold">
                {comment.author.name?.[0] ?? "?"}
              </div>
            )}
            <span className="text-sm font-semibold text-slate-800">
              {comment.author.name ?? "알 수 없음"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
            <GitPullRequest className="w-3 h-3" />
            <span className="text-slate-400 font-normal">{comment.pullRequest.repo.name}</span>
            <span className="text-slate-300">/</span>
            <span>#{comment.pullRequest.number}</span>
          </div>
        </div>

        {/* PR 제목 */}
        <p className="text-xs text-slate-500 truncate">
          {comment.pullRequest.title}
        </p>

        {/* 댓글 내용 */}
        <div className="flex items-start gap-2">
          <MessageSquare className="w-4 h-4 text-slate-300 mt-0.5 shrink-0" />
          <p className="text-sm text-slate-700 line-clamp-3 leading-relaxed">
            {comment.content}
          </p>
        </div>

        {/* 인라인 위치 정보 */}
        {comment.filePath && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <FileCode className="w-3 h-3" />
            <span className="font-mono truncate">{comment.filePath}</span>
            {comment.lineNumber && (
              <span className="text-slate-300">:{comment.lineNumber}</span>
            )}
          </div>
        )}

        {/* 시간 */}
        <p className="text-[11px] text-slate-400 italic">{relativeTime}</p>
      </div>

      {/* Hover 인디케이터 */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 group-hover:h-12 bg-blue-600 rounded-r-full transition-all duration-300" />
    </Card>
  )
}
