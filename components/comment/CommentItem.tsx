"use client"

import Image from "next/image"
import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import { Pencil, Trash2, CheckCheck, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { recordRender } from "@/lib/measurements/renderCounter"
import ReactionBar from "./ReactionBar"
import CommentInput from "./CommentInput"
import type { CommentWithAuthor, ReactionEmoji, MentionUser } from "@/types/comment"

interface CommentItemProps {
  comment: CommentWithAuthor
  currentUserId: string
  isReply?: boolean
  mentionUsers?: MentionUser[]
  onUpdate: (commentId: string, content: string) => void
  onDelete: (commentId: string) => void
  onReaction: (commentId: string, emoji: ReactionEmoji) => void
  onResolve: (commentId: string) => void
  onReply?: () => void
  isUpdating?: boolean
}

// @[name](userId) 형식을 하이라이트 처리
function renderContent(content: string) {
  const parts = content.split(/(@\[[^\]]+\]\([^)]+\))/g)
  return parts.map((part, i) => {
    const match = part.match(/^@\[([^\]]+)\]\(([^)]+)\)$/)
    if (match) {
      return (
        <span key={i} className="inline-flex items-center px-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
          @{match[1]}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export default function CommentItem({
  comment,
  currentUserId,
  isReply = false,
  mentionUsers = [],
  onUpdate,
  onDelete,
  onReaction,
  onResolve,
  onReply,
  isUpdating = false,
}: CommentItemProps) {
  recordRender("CommentItem")
  recordRender(comment.parentId ? "CommentItem:reply" : "CommentItem:root")

  const [editing, setEditing] = useState(false)
  const isOwner = comment.authorId === currentUserId

  const handleUpdate = (content: string) => {
    onUpdate(comment.id, content)
    setEditing(false)
  }

  return (
    <div className={`flex gap-3 ${comment.isResolved ? "opacity-60" : ""}`}>
      {/* 아바타 */}
      <div className="shrink-0">
        {comment.author.image ? (
          <Image
            src={comment.author.image}
            alt={comment.author.name ?? ""}
            width={32}
            height={32}
            className="rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300">
            {comment.author.name?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {/* 헤더 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {comment.author.name ?? "알 수 없음"}
          </span>
          <span className="text-xs text-slate-400">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ko })}
          </span>
          {comment.updatedAt !== comment.createdAt && (
            <span className="text-xs text-slate-400">(수정됨)</span>
          )}
          {comment.isResolved && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCheck size={12} />
              해결됨
            </span>
          )}
        </div>

        {/* 본문 or 편집 */}
        {editing ? (
          <div className="mt-2">
            <CommentInput
              initialValue={comment.content}
              submitLabel="수정 완료"
              onSubmit={handleUpdate}
              onCancel={() => setEditing(false)}
              isLoading={isUpdating}
              mentionUsers={mentionUsers}
            />
          </div>
        ) : (
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap wrap-break-word leading-relaxed">
            {renderContent(comment.content)}
          </p>
        )}

        {/* 액션 바 */}
        {!editing && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            <ReactionBar
              reactions={comment.reactions}
              currentUserId={currentUserId}
              onToggle={(emoji) => onReaction(comment.id, emoji)}
            />
            <div className="flex items-center gap-1 ml-auto">
              {!isReply && onReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-slate-500"
                  onClick={onReply}
                >
                  <MessageSquare size={12} className="mr-1" />
                  답글
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 px-2 text-xs ${
                  comment.isResolved
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-slate-500"
                }`}
                onClick={() => onResolve(comment.id)}
                title={comment.isResolved ? "resolve 취소" : "resolve"}
              >
                <CheckCheck size={12} />
              </Button>
              {isOwner && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-slate-500"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil size={12} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-rose-500 hover:text-rose-600"
                    onClick={() => onDelete(comment.id)}
                  >
                    <Trash2 size={12} />
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
