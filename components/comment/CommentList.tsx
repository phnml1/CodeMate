"use client"

import { useCallback, useMemo, useRef, useEffect, useState } from "react"
import Image from "next/image"
import { MessageSquare, ChevronDown, Send, Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import { useCreateComment, useDeleteComment } from "@/hooks/useComments"
import { useRealtimeComments } from "@/hooks/useRealtimeComments"
import { useTypingIndicator } from "@/hooks/useTypingIndicator"
import { usePRDetail } from "@/hooks/usePRDetail"
import type { CommentWithAuthor, MentionUser } from "@/types/comment"

interface CommentListProps {
  prId: string
  currentUserId: string
}

function renderContent(content: string, isOwn: boolean) {
  const parts = content.split(/(@\[[^\]]+\]\([^)]+\))/g)
  return parts.map((part, i) => {
    const match = part.match(/^@\[([^\]]+)\]\(([^)]+)\)$/)
    if (match) {
      return (
        <span
          key={i}
          className={`inline-flex items-center px-1 rounded font-semibold text-xs ${
            isOwn
              ? "bg-white/25 text-white"
              : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
          }`}
        >
          @{match[1]}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}

function ChatBubble({
  comment,
  isOwn,
  currentUserId,
  prId,
  showName,
}: {
  comment: CommentWithAuthor
  isOwn: boolean
  currentUserId: string
  prId: string
  showName: boolean
}) {
  const deleteComment = useDeleteComment(prId)

  return (
    <div className={`flex items-end gap-2 group ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
      {/* 아바타 */}
      <div className={`shrink-0 self-end ${showName ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        {comment.author.image ? (
          <Image
            src={comment.author.image}
            alt={comment.author.name ?? ""}
            width={28}
            height={28}
            className="rounded-full ring-2 ring-white dark:ring-slate-900"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
            {comment.author.name?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
      </div>

      {/* 말풍선 영역 */}
      <div className={`flex flex-col gap-0.5 max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
        {/* 발신자 이름 (연속 메시지 제외) */}
        {!isOwn && showName && (
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 px-2">
            {comment.author.name}
          </span>
        )}

        <div className={`flex items-end gap-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
          {/* 말풍선 */}
          <div
            className={`relative px-3.5 py-2 text-sm leading-relaxed break-words shadow-sm ${
              isOwn
                ? "bg-blue-500 text-white rounded-[18px] rounded-br-[4px]"
                : "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-[18px] rounded-bl-[4px] border border-slate-100 dark:border-slate-600"
            }`}
          >
            {renderContent(comment.content, isOwn)}
          </div>

          {/* 삭제 버튼 — hover 시 */}
          {isOwn && (
            <button
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-rose-400 mb-1 shrink-0"
              onClick={() => deleteComment.mutate(comment.id)}
              disabled={deleteComment.isPending}
              title="삭제"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>

        {/* 시간 */}
        <span className={`text-[9px] text-slate-400 px-2 ${isOwn ? "text-right" : ""}`}>
          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ko })}
        </span>

        {/* 답글 */}
        {comment.replies.length > 0 && (
          <div className={`mt-0.5 flex flex-col gap-1 w-full ${isOwn ? "items-end" : "items-start"}`}>
            {comment.replies.map((reply) => {
              const isOwnReply = reply.authorId === currentUserId
              return (
                <div
                  key={reply.id}
                  className={`px-3 py-1.5 rounded-2xl text-xs max-w-[90%] break-words shadow-sm border ${
                    isOwnReply
                      ? "bg-blue-400 text-white border-transparent rounded-br-sm"
                      : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-600 rounded-bl-sm"
                  }`}
                >
                  {!isOwnReply && (
                    <span className="block text-[9px] opacity-60 font-semibold mb-0.5">
                      {reply.author.name}
                    </span>
                  )}
                  {renderContent(reply.content, isOwnReply)}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CommentList({ prId, currentUserId }: CommentListProps) {
  const { data: allComments = [], isLoading } = useRealtimeComments(prId)
  const createComment = useCreateComment(prId)
  const { names: typingNames, onTyping, onTypingStop } = useTypingIndicator(prId)
  const { data: pr } = usePRDetail(prId)
  const [open, setOpen] = useState(true)
  const [input, setInput] = useState("")
  const chatEndRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const isInitialMountRef = useRef(true)

  const generalComments = useMemo(
    () => allComments.filter((c) => c.filePath == null),
    [allComments]
  )

  const mentionUsers = useMemo(() => {
    const seen = new Set<string>()
    const users: MentionUser[] = []
    const candidates = [
      pr?.repo.owner,
      ...allComments.flatMap((c) => [c.author, ...c.replies.map((r) => r.author)]),
    ]
    for (const u of candidates) {
      if (u && !seen.has(u.id) && u.id !== currentUserId) {
        seen.add(u.id)
        users.push(u)
      }
    }
    return users
  }, [pr, allComments, currentUserId])

  // 초기 로드 플래그만 유지
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
    }
  }, [generalComments.length])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    isAtBottomRef.current = el.scrollHeight - el.scrollTop <= el.clientHeight + 60
  }

  const handleSend = useCallback(() => {
    if (!input.trim()) return
    const mentions = mentionUsers
      .filter((u) => u.name && input.includes(`@${u.name}`))
      .map((u) => u.id)
    createComment.mutate({ content: input.trim(), mentions })
    setInput("")
    onTypingStop()
    isAtBottomRef.current = true
  }, [input, mentionUsers, createComment, onTypingStop])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {/* 헤더 */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors border-b border-slate-200 dark:border-slate-700"
        >
          <div className="flex items-center gap-2">
            <MessageSquare size={15} className="text-blue-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">댓글</span>
            {generalComments.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                {generalComments.length}
              </span>
            )}
          </div>
          <ChevronDown
            size={15}
            className={`text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>

      {open && (
        <>
          {/* ─── 채팅 메시지 영역 ─── */}
          <div
            onScroll={handleScroll}
            className="overflow-y-auto px-4 py-5 space-y-1.5 bg-slate-50 dark:bg-slate-950"
            style={{ minHeight: 180, maxHeight: 420 }}
          >
            {isLoading ? (
              <div className="h-40 flex items-center justify-center text-sm text-slate-400">
                불러오는 중...
              </div>
            ) : generalComments.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center gap-2 text-slate-400">
                <MessageSquare size={30} className="opacity-20" />
                <span className="text-sm">첫 번째 메시지를 남겨보세요</span>
              </div>
            ) : (
              <>
                {generalComments.map((comment, idx) => {
                  const isOwn = comment.authorId === currentUserId
                  const prev = generalComments[idx - 1]
                  // 같은 발신자가 연속이면 이름/아바타 숨김
                  const showName = !prev || prev.authorId !== comment.authorId
                  return (
                    <div key={comment.id} className={showName && idx > 0 ? "mt-3" : ""}>
                      <ChatBubble
                        comment={comment}
                        isOwn={isOwn}
                        currentUserId={currentUserId}
                        prId={prId}
                        showName={showName}
                      />
                    </div>
                  )
                })}
              </>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* ─── 타이핑 표시 ─── */}
          {typingNames.length > 0 && (
            <div className="px-4 py-1.5 flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
              <span>
                {typingNames.length === 1
                  ? `${typingNames[0]}님이 입력 중`
                  : `${typingNames[0]} 외 ${typingNames.length - 1}명이 입력 중`}
              </span>
              <span className="flex items-end gap-0.5">
                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          )}

          {/* ─── 입력창 ─── */}
          <div className="flex items-end gap-2 px-3 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                onTyping()
                // 입력창 자동 높이
                e.target.style.height = "auto"
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
              }}
              onBlur={onTypingStop}
              onKeyDown={handleKeyDown}
              placeholder="메시지 입력… (Enter 전송 · Shift+Enter 줄바꿈)"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition overflow-hidden"
              style={{ lineHeight: "1.5", minHeight: 38 }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || createComment.isPending}
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-white shadow-sm"
            >
              <Send size={15} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
