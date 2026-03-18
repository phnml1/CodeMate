"use client"

import { useState, useRef, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import type { MentionUser } from "@/types/comment"

interface CommentInputProps {
  onSubmit: (content: string, mentions: string[]) => void
  onCancel?: () => void
  onFocus?: () => void
  onBlur?: () => void
  initialValue?: string
  placeholder?: string
  submitLabel?: string
  isLoading?: boolean
  mentionUsers?: MentionUser[]
}

// @[name](userId) 형식의 멘션에서 userId 추출
function extractMentions(content: string): string[] {
  const regex = /@\[([^\]]+)\]\(([^)]+)\)/g
  const ids: string[] = []
  let match
  while ((match = regex.exec(content)) !== null) {
    ids.push(match[2])
  }
  return [...new Set(ids)]
}

export default function CommentInput({
  onSubmit,
  onCancel,
  onFocus,
  onBlur,
  initialValue = "",
  placeholder = "댓글을 입력하세요... (@로 멘션)",
  submitLabel = "댓글 작성",
  isLoading = false,
  mentionUsers = [],
}: CommentInputProps) {
  const [content, setContent] = useState(initialValue)
  const [showMentionPop, setShowMentionPop] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const [mentionCursorPos, setMentionCursorPos] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const filteredUsers = mentionUsers.filter((u) =>
    u.name?.toLowerCase().includes(mentionQuery.toLowerCase())
  )

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setContent(val)

    const cursor = e.target.selectionStart ?? 0
    const textBeforeCursor = val.slice(0, cursor)
    const atMatch = textBeforeCursor.match(/@(\w*)$/)

    if (atMatch) {
      setMentionQuery(atMatch[1])
      setMentionCursorPos(cursor - atMatch[0].length)
      setShowMentionPop(true)
    } else {
      setShowMentionPop(false)
    }
  }

  const handleMentionSelect = (user: MentionUser) => {
    const before = content.slice(0, mentionCursorPos)
    const after = content.slice(mentionCursorPos).replace(/@\w*/, "")
    const inserted = `@[${user.name}](${user.id}) `
    setContent(before + inserted + after)
    setShowMentionPop(false)
    textareaRef.current?.focus()
  }

  const handleSubmit = () => {
    if (!content.trim()) return
    const mentions = extractMentions(content)
    onSubmit(content.trim(), mentions)
    setContent("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      setShowMentionPop(false)
      onCancel?.()
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  useEffect(() => {
    setContent(initialValue)
  }, [initialValue])

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={3}
        className="resize-none text-sm"
      />

      {/* 멘션 팝오버 */}
      {showMentionPop && filteredUsers.length > 0 && (
        <div className="absolute z-20 bottom-full mb-1 left-0 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
          {filteredUsers.slice(0, 6).map((user) => (
            <button
              key={user.id}
              onClick={() => handleMentionSelect(user)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-left"
            >
              {user.image ? (
                <img src={user.image} alt={user.name ?? ""} className="w-6 h-6 rounded-full" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                  {user.name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <span className="text-sm text-slate-700 dark:text-slate-300">{user.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-slate-400">Ctrl+Enter로 제출</span>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={isLoading}>
              취소
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!content.trim() || isLoading}
          >
            {isLoading ? "처리 중..." : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
