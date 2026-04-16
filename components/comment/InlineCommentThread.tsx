"use client"

import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import { Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDeleteComment } from "@/hooks/useComments"
import type { CommentWithAuthor } from "@/types/comment"

interface InlineCommentThreadProps {
  comments: CommentWithAuthor[]
  currentUserId: string
  prId: string
}

export default function InlineCommentThread({
  comments,
  currentUserId,
  prId,
}: InlineCommentThreadProps) {
  const deleteComment = useDeleteComment(prId)

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700">
      {comments.map((comment) => {
        const isDeletingComment =
          deleteComment.isPending && deleteComment.variables === comment.id

        return (
        <div key={comment.id} id={`comment-${comment.id}`} className="px-4 py-3 flex gap-3">
          <div className="shrink-0">
            {comment.author.image ? (
              <Image
                src={comment.author.image}
                alt={comment.author.name ?? ""}
                width={24}
                height={24}
                className="rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                {comment.author.name?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {comment.author.name ?? "알 수 없음"}
                </span>
                <span className="text-[11px] text-slate-400">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ko })}
                </span>
              </div>
              {comment.authorId === currentUserId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1 text-rose-500 hover:text-rose-600 shrink-0"
                  onClick={() => deleteComment.mutate(comment.id)}
                  disabled={deleteComment.isPending}
                >
                  <Trash2 size={11} />
                </Button>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {comment.content}
            </p>
            {isDeletingComment && (
              <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-300">
                <Loader2 size={11} className="animate-spin" />
                삭제 중입니다...
              </div>
            )}
          </div>
        </div>
      )})}
    </div>
  )
}
