"use client"

import { useState } from "react"
import {
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useToggleReaction,
  useToggleResolve,
} from "@/hooks/useComments"
import CommentItem from "./CommentItem"
import CommentInput from "./CommentInput"
import type { CommentWithAuthor, ReactionEmoji } from "@/types/comment"

interface CommentThreadProps {
  comment: CommentWithAuthor
  prId: string
  currentUserId: string
}

export default function CommentThread({ comment, prId, currentUserId }: CommentThreadProps) {
  const [replyOpen, setReplyOpen] = useState(false)
  const [repliesCollapsed, setRepliesCollapsed] = useState(false)

  const createComment = useCreateComment(prId)
  const updateComment = useUpdateComment(prId)
  const deleteComment = useDeleteComment(prId)
  const toggleReaction = useToggleReaction(prId)
  const toggleResolve = useToggleResolve(prId)

  const handleUpdate = (commentId: string, content: string) => {
    updateComment.mutate({ commentId, input: { content } })
  }

  const handleDelete = (commentId: string) => {
    deleteComment.mutate(commentId)
  }

  const handleReaction = (commentId: string, emoji: ReactionEmoji) => {
    toggleReaction.mutate({ commentId, emoji })
  }

  const handleResolve = (commentId: string) => {
    toggleResolve.mutate(commentId)
  }

  const handleReply = (content: string, mentions: string[]) => {
    createComment.mutate({ content, parentId: comment.id, mentions })
    setReplyOpen(false)
  }

  return (
    <div className="space-y-3">
      <CommentItem
        comment={comment}
        currentUserId={currentUserId}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onReaction={handleReaction}
        onResolve={handleResolve}
        onReply={() => setReplyOpen((v) => !v)}
        isUpdating={updateComment.isPending}
      />

      {(comment.replies.length > 0 || replyOpen) && (
        <div className="ml-11 space-y-3 border-l-2 border-slate-100 dark:border-slate-800 pl-4">
          {comment.replies.length > 0 && (
            <button
              onClick={() => setRepliesCollapsed((v) => !v)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              {repliesCollapsed
                ? `답글 ${comment.replies.length}개 보기`
                : `답글 ${comment.replies.length}개 숨기기`}
            </button>
          )}

          {!repliesCollapsed &&
            comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                isReply
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onReaction={handleReaction}
                onResolve={handleResolve}
                isUpdating={updateComment.isPending}
              />
            ))}

          {replyOpen && (
            <CommentInput
              placeholder="답글을 입력하세요..."
              submitLabel="답글 작성"
              onSubmit={handleReply}
              onCancel={() => setReplyOpen(false)}
              isLoading={createComment.isPending}
            />
          )}
        </div>
      )}
    </div>
  )
}
