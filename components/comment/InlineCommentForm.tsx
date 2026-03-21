"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useCreateComment } from "@/hooks/useComments"
import { useInlineTypingIndicator } from "@/hooks/useInlineTypingIndicator"

interface InlineCommentFormProps {
  prId: string
  filePath: string
  lineNumber: number
  onClose: () => void
}

export default function InlineCommentForm({
  prId,
  filePath,
  lineNumber,
  onClose,
}: InlineCommentFormProps) {
  const [content, setContent] = useState("")
  const createComment = useCreateComment(prId)
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
      { onSuccess: () => { setContent(""); onClose() } }
    )
  }

  return (
    <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/20 border-y border-blue-200 dark:border-blue-900">
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
        placeholder="댓글을 입력하세요... (Ctrl+Enter로 제출)"
        rows={3}
        className="w-full rounded-md border border-input bg-white dark:bg-slate-900 px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex items-center justify-end gap-2 mt-2">
        <Button variant="ghost" size="sm" onClick={handleClose} disabled={createComment.isPending}>
          취소
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!content.trim() || createComment.isPending}
        >
          {createComment.isPending ? "처리 중..." : "댓글 작성"}
        </Button>
      </div>
    </div>
  )
}
