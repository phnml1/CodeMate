"use client"

import Image from "next/image"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import type { MentionUser } from "@/types/comment"

interface CommentInputProps {
  onSubmit: (content: string, mentions: string[]) => void
  onCancel?: () => void
  onTyping?: () => void
  onTypingStop?: () => void
  initialValue?: string
  placeholder?: string
  submitLabel?: string
  isLoading?: boolean
  mentionUsers?: MentionUser[]
}

// @이름 부분을 파란색 span으로 변환
function getHighlightedHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>")
  return escaped.replace(/@(\S+)/g, '<span style="color:#3b82f6;font-weight:500;">@$1</span>') + "&nbsp;"
}

export default function CommentInput({
  onSubmit,
  onCancel,
  onTyping,
  onTypingStop,
  initialValue = "",
  placeholder = "댓글을 입력하세요... (@로 멘션)",
  submitLabel = "댓글 작성",
  isLoading = false,
  mentionUsers = [],
}: CommentInputProps) {
  const [content, setContent] = useState(initialValue)
  const [mentionMap, setMentionMap] = useState<Record<string, string>>({})
  const [showMentionPop, setShowMentionPop] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const [mentionCursorPos, setMentionCursorPos] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const filteredUsers = mentionUsers.filter((u) =>
    u.name?.toLowerCase().includes(mentionQuery.toLowerCase())
  )

  const syncScroll = () => {
    if (overlayRef.current && textareaRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setContent(val)
    onTyping?.()
    syncScroll()

    const cursor = e.target.selectionStart ?? 0
    const textBeforeCursor = val.slice(0, cursor)
    const atMatch = textBeforeCursor.match(/@(\S*)$/)

    if (atMatch) {
      setMentionQuery(atMatch[1])
      setMentionCursorPos(cursor - atMatch[0].length)
      setShowMentionPop(true)
    } else {
      setShowMentionPop(false)
    }
  }

  const handleMentionSelect = (user: MentionUser) => {
    const name = user.name ?? user.id
    const before = content.slice(0, mentionCursorPos)
    const after = content.slice(mentionCursorPos).replace(/@\S*/, "")
    setContent(before + `@${name} ` + after)
    setMentionMap((prev) => ({ ...prev, [name]: user.id }))
    setShowMentionPop(false)
    textareaRef.current?.focus()
  }

  const handleSubmit = () => {
    if (!content.trim()) return
    const mentions = Object.entries(mentionMap)
      .filter(([name]) => content.includes(`@${name}`))
      .map(([, id]) => id)
    onSubmit(content.trim(), [...new Set(mentions)])
    setContent("")
    setMentionMap({})
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
      {/* 하이라이트 오버레이 - textarea와 완전히 동일한 크기/패딩 */}
      <div
        ref={overlayRef}
        aria-hidden
        className="absolute inset-0 pointer-events-none rounded-md px-3 py-2 text-sm whitespace-pre-wrap wrap-break-word overflow-hidden"
        dangerouslySetInnerHTML={{ __html: getHighlightedHtml(content) }}
      />

      {/* textarea - 텍스트 투명, 커서만 표시 */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={onTypingStop}
        onScroll={syncScroll}
        placeholder={placeholder}
        rows={3}
        className="relative z-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        style={{ color: "transparent", caretColor: "var(--foreground, #0f172a)" }}
      />

      {/* 멘션 팝오버 */}
      {showMentionPop && filteredUsers.length > 0 && (
        <div className="absolute z-20 bottom-full mb-1 left-0 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
          {filteredUsers.slice(0, 6).map((user) => (
            <button
              key={user.id}
              onMouseDown={(e) => {
                e.preventDefault()
                handleMentionSelect(user)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-left"
            >
              {user.image ? (
                <Image src={user.image} alt={user.name ?? ""} width={24} height={24} className="rounded-full" />
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
