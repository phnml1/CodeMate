"use client"

import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import { Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  useDeleteComment,
  useToggleReaction,
} from "@/hooks/useComments"
import type { CommentWithAuthor, ReactionEmoji } from "@/types/comment"
import ReactionBar from "./ReactionBar"

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
  const toggleReaction = useToggleReaction(prId, currentUserId)

  const handleReaction = (commentId: string, emoji: ReactionEmoji) => {
    toggleReaction.mutate({ commentId, emoji })
  }

  return (
    <div className="divide-y divide-slate-200 border-y border-slate-200 bg-slate-50 dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800/50">
      {comments.map((comment) => {
        const isDeletingComment =
          deleteComment.isPending && deleteComment.variables === comment.id

        return (
          <div key={comment.id} id={`comment-${comment.id}`} className="flex gap-3 px-4 py-3">
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
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-300 text-[10px] font-bold text-slate-600 dark:bg-slate-600 dark:text-slate-300">
                  {comment.author.name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {comment.author.name ?? "이름 없음"}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {formatDistanceToNow(new Date(comment.createdAt), {
                      addSuffix: true,
                      locale: ko,
                    })}
                  </span>
                </div>
                {comment.authorId === currentUserId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 shrink-0 px-1 text-rose-500 hover:text-rose-600"
                    onClick={() => deleteComment.mutate(comment.id)}
                    disabled={deleteComment.isPending}
                  >
                    <Trash2 size={11} />
                  </Button>
                )}
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-300">
                {comment.content}
              </p>
              <ReactionBar
                reactions={comment.reactions ?? {}}
                currentUserId={currentUserId}
                onToggle={(emoji) => handleReaction(comment.id, emoji)}
                className="mt-2"
              />
              {isDeletingComment && (
                <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-300">
                  <Loader2 size={11} className="animate-spin" />
                  삭제 중입니다...
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
