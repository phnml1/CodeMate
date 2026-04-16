"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCreateComment } from "@/hooks/useComments"
import { useInlineTypingIndicator } from "@/hooks/useInlineTypingIndicator"

interface InlineCommentFormProps {
  prId: string
  filePath: string
  lineNumber: number
  currentUserId?: string
  onClose: () => void
}

export default function InlineCommentForm({
  prId,
  filePath,
  lineNumber,
  currentUserId = "",
  onClose,
}: InlineCommentFormProps) {
  const [content, setContent] = useState("")
  const createComment = useCreateComment(prId, { id: currentUserId })
  const { onInlineTyping, onInlineTypingStop } = useInlineTypingIndicator(prId)

  const handleClose = () => {
    onInlineTypingStop()
    onClose()
  }

  const handleSubmit = () => {
    if (!content.trim()) return

    onInlineTypingStop()
    createComment.mutate(
      { content: content.trim(), filePath, lineNumber },
      {
        onSuccess: () => {
          setContent("")
          onClose()
        },
      }
    )
  }

  return (
    <div className="border-y border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/20">
      <textarea
        autoFocus
        value={content}
        onChange={(e) => {
          setContent(e.target.value)
          onInlineTyping(filePath, lineNumber)
        }}
        onBlur={onInlineTypingStop}
        onKeyDown={(e) => {
          if (e.key === "Escape") handleClose()
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            handleSubmit()
          }
        }}
        placeholder="댓글을 입력하세요. Ctrl+Enter로 등록합니다."
        rows={3}
        className="w-full resize-none rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-slate-900"
      />

      {createComment.isPending && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300">
          <Loader2 size={12} className="animate-spin" />
          코멘트를 반영하는 중입니다...
        </div>
      )}

      <div className="mt-2 flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={handleClose} disabled={createComment.isPending}>
          취소
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!content.trim() || createComment.isPending}
        >
          {createComment.isPending && <Loader2 size={14} className="animate-spin" />}
          {createComment.isPending ? "반영 중..." : "댓글 작성"}
        </Button>
      </div>
    </div>
  )
}
