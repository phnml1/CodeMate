"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import {
  AlertCircle,
  ChevronDown,
  Loader2,
  MessageSquare,
  Send,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { useCreateComment, useDeleteComment } from "@/hooks/useComments"
import { usePRDetail } from "@/hooks/usePRDetail"
import { useRealtimeComments } from "@/hooks/useRealtimeComments"
import { useSocket } from "@/hooks/useSocket"
import { useTypingIndicator } from "@/hooks/useTypingIndicator"
import { cn } from "@/lib/utils"
import type { CommentWithAuthor, MentionUser } from "@/types/comment"

interface CommentListProps {
  prId: string
  currentUserId: string
}

const isSocketMode = process.env.NEXT_PUBLIC_REALTIME_MODE === "socket"

function isOptimisticComment(commentId: string) {
  return commentId.startsWith("optimistic-comment-")
}

function renderContent(content: string, isOwn: boolean) {
  const parts = content.split(/(@\[[^\]]+\]\([^)]+\))/g)

  return parts.map((part, index) => {
    const match = part.match(/^@\[([^\]]+)\]\(([^)]+)\)$/)
    if (!match) return <span key={index}>{part}</span>

    return (
      <span
        key={index}
        className={cn(
          "inline-flex items-center rounded px-1 text-xs font-semibold",
          isOwn
            ? "bg-white/25 text-white"
            : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
        )}
      >
        @{match[1]}
      </span>
    )
  })
}

function ConnectionBadge() {
  const { connectionStatus, connectionError } = useSocket()

  if (!isSocketMode) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-slate-200 bg-white/80 text-slate-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300"
      >
        <span className="size-1.5 rounded-full bg-slate-400" />
        폴링 모드
      </Badge>
    )
  }

  if (connectionStatus === "connected") {
    return (
      <Badge className="gap-1 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:bg-emerald-500/15 dark:text-emerald-300">
        <Wifi size={12} />
        실시간 연결
      </Badge>
    )
  }

  if (connectionStatus === "connecting" || connectionStatus === "reconnecting") {
    return (
      <Badge className="gap-1 bg-blue-500/10 text-blue-700 hover:bg-blue-500/10 dark:bg-blue-500/15 dark:text-blue-300">
        <Loader2 size={12} className="animate-spin" />
        {connectionStatus === "connecting" ? "연결 중" : "재연결 중"}
      </Badge>
    )
  }

  if (connectionStatus === "error") {
    return (
      <Badge
        className="gap-1 bg-rose-500/10 text-rose-700 hover:bg-rose-500/10 dark:bg-rose-500/15 dark:text-rose-300"
        title={connectionError ?? "소켓 연결 오류"}
      >
        <AlertCircle size={12} />
        연결 오류
      </Badge>
    )
  }

  return (
    <Badge className="gap-1 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 dark:bg-amber-500/15 dark:text-amber-300">
      <WifiOff size={12} />
      연결 끊김
    </Badge>
  )
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
  const isPendingComment = isOptimisticComment(comment.id)
  const isDeletingComment =
    deleteComment.isPending && deleteComment.variables === comment.id

  return (
    <div className={cn("group flex items-end gap-2", isOwn ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "shrink-0 self-end transition-opacity",
          showName ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        {comment.author.image ? (
          <Image
            src={comment.author.image}
            alt={comment.author.name ?? ""}
            width={28}
            height={28}
            className="rounded-full ring-2 ring-white dark:ring-slate-900"
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
            {comment.author.name?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex max-w-[70%] flex-col gap-0.5",
          isOwn ? "items-end" : "items-start"
        )}
      >
        {!isOwn && showName && (
          <span className="px-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
            {comment.author.name}
          </span>
        )}

        <div className={cn("flex items-end gap-1", isOwn ? "flex-row-reverse" : "flex-row")}>
          <div
            className={cn(
              "relative px-3.5 py-2 text-sm leading-relaxed break-words shadow-sm transition-opacity",
              isOwn
                ? "rounded-[18px] rounded-br-[4px] bg-blue-500 text-white"
                : "rounded-[18px] rounded-bl-[4px] border border-slate-100 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100",
              (isPendingComment || isDeletingComment) && "opacity-80"
            )}
          >
            {renderContent(comment.content, isOwn)}

            {isPendingComment && (
              <div
                className={cn(
                  "mt-2 inline-flex items-center gap-1 text-[10px] font-medium",
                  isOwn ? "text-white/80" : "text-slate-500 dark:text-slate-300"
                )}
              >
                <Loader2 size={10} className="animate-spin" />
                전송 중
              </div>
            )}
          </div>

          {isDeletingComment && (
            <span
              className={cn(
                "mb-1 inline-flex shrink-0 items-center gap-1 text-[10px] font-medium",
                isOwn ? "text-blue-200" : "text-slate-500 dark:text-slate-300"
              )}
            >
              <Loader2 size={10} className="animate-spin" />
              삭제 중입니다...
            </span>
          )}

          {isOwn && !isPendingComment && (
            <button
              className="mb-1 shrink-0 text-slate-300 opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
              onClick={() => deleteComment.mutate(comment.id)}
              disabled={deleteComment.isPending}
              title="댓글 삭제"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>

        <span className={cn("px-2 text-[9px] text-slate-400", isOwn && "text-right")}>
          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ko })}
        </span>

        {(comment.replies?.length ?? 0) > 0 && (
          <div
            className={cn(
              "mt-0.5 flex w-full flex-col gap-1",
              isOwn ? "items-end" : "items-start"
            )}
          >
            {(comment.replies ?? []).map((reply) => {
              const isOwnReply = reply.authorId === currentUserId
              const isPendingReply = isOptimisticComment(reply.id)

              return (
                <div
                  key={reply.id}
                  className={cn(
                    "max-w-[90%] break-words rounded-2xl border px-3 py-1.5 text-xs shadow-sm",
                    isOwnReply
                      ? "rounded-br-sm border-transparent bg-blue-400 text-white"
                      : "rounded-bl-sm border-slate-100 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300",
                    isPendingReply && "opacity-80"
                  )}
                >
                  {!isOwnReply && (
                    <span className="mb-0.5 block text-[9px] font-semibold opacity-60">
                      {reply.author.name}
                    </span>
                  )}
                  {renderContent(reply.content, isOwnReply)}
                  {isPendingReply && (
                    <div
                      className={cn(
                        "mt-1 inline-flex items-center gap-1 text-[10px] font-medium",
                        isOwnReply ? "text-white/80" : "text-slate-500 dark:text-slate-300"
                      )}
                    >
                      <Loader2 size={10} className="animate-spin" />
                      전송 중
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CommentList({
  prId,
  currentUserId,
}: CommentListProps) {
  const { data: allComments = [], isLoading } = useRealtimeComments(prId)
  const createComment = useCreateComment(prId)
  const { names: typingNames, onTyping, onTypingStop } = useTypingIndicator(prId)
  const { connectionStatus, connectionError } = useSocket()
  const { data: pr } = usePRDetail(prId)
  const [open, setOpen] = useState(true)
  const [input, setInput] = useState("")
  const chatEndRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const isInitialMountRef = useRef(true)

  const generalComments = useMemo(
    () => allComments.filter((comment) => comment.filePath == null),
    [allComments]
  )

  const mentionUsers = useMemo(() => {
    const seen = new Set<string>()
    const users: MentionUser[] = []
    const candidates = [
      pr?.repo.owner,
      ...allComments.flatMap((comment) => [
        comment.author,
        ...(Array.isArray(comment.replies) ? comment.replies : []).map((reply) => reply.author),
      ]),
    ]

    for (const user of candidates) {
      if (user && !seen.has(user.id) && user.id !== currentUserId) {
        seen.add(user.id)
        users.push(user)
      }
    }

    return users
  }, [pr, allComments, currentUserId])

  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
    }
  }, [generalComments.length])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget
    isAtBottomRef.current = element.scrollHeight - element.scrollTop <= element.clientHeight + 60
  }

  const handleSend = useCallback(() => {
    if (!input.trim()) return

    const mentions = mentionUsers
      .filter((user) => user.name && input.includes(`@${user.name}`))
      .map((user) => user.id)

    createComment.mutate({ content: input.trim(), mentions })
    setInput("")
    onTypingStop()
    isAtBottomRef.current = true
  }, [createComment, input, mentionUsers, onTypingStop])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const shouldShowSocketWarning =
    isSocketMode &&
    (connectionStatus === "error" ||
      connectionStatus === "disconnected" ||
      connectionStatus === "reconnecting")

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-700/80"
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={15} className="text-blue-500" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">댓글</span>
          {generalComments.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
              {generalComments.length}
            </span>
          )}
          <ConnectionBadge />
        </div>
        <ChevronDown
          size={15}
          className={cn(
            "text-slate-400 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <>
          {shouldShowSocketWarning && (
            <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertCircle size={14} className="shrink-0" />
              <span>
                {connectionStatus === "reconnecting"
                  ? "실시간 연결을 다시 시도하고 있습니다."
                  : "실시간 동기화가 지연될 수 있습니다."}
                {connectionError ? ` ${connectionError}` : ""}
              </span>
            </div>
          )}

          <div
            onScroll={handleScroll}
            className="space-y-1.5 overflow-y-auto bg-slate-50 px-4 py-5 dark:bg-slate-950"
            style={{ minHeight: 180, maxHeight: 420 }}
          >
            {isLoading ? (
              <div className="flex h-40 items-center justify-center text-sm text-slate-400">
                댓글을 불러오는 중입니다...
              </div>
            ) : generalComments.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-400">
                <MessageSquare size={30} className="opacity-20" />
                <span className="text-sm">첫 번째 댓글을 남겨보세요.</span>
              </div>
            ) : (
              generalComments.map((comment, index) => {
                const isOwn = comment.authorId === currentUserId
                const prev = generalComments[index - 1]
                const showName = !prev || prev.authorId !== comment.authorId

                return (
                  <div key={comment.id} className={cn(showName && index > 0 && "mt-3")}>
                    <ChatBubble
                      comment={comment}
                      isOwn={isOwn}
                      currentUserId={currentUserId}
                      prId={prId}
                      showName={showName}
                    />
                  </div>
                )
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {typingNames.length > 0 && (
            <div className="flex items-center gap-1.5 border-t border-slate-100 bg-slate-50 px-4 py-1.5 text-[11px] text-slate-400 dark:border-slate-800 dark:bg-slate-950">
              <span>
                {typingNames.length === 1
                  ? `${typingNames[0]}님이 입력 중입니다`
                  : `${typingNames[0]} 외 ${typingNames.length - 1}명이 입력 중입니다`}
              </span>
              <span className="flex items-end gap-0.5">
                <span className="h-1 w-1 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                <span className="h-1 w-1 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                <span className="h-1 w-1 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          )}

          <div className="border-t border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  onTyping()
                  e.target.style.height = "auto"
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
                }}
                onBlur={onTypingStop}
                onKeyDown={handleKeyDown}
                placeholder="댓글을 입력하세요. Enter 전송, Shift+Enter 줄바꿈"
                rows={1}
                className="flex-1 resize-none overflow-hidden rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                style={{ lineHeight: "1.5", minHeight: 38 }}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || createComment.isPending}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white shadow-sm transition-colors hover:bg-blue-600 active:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                title="댓글 전송"
              >
                {createComment.isPending ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Send size={15} />
                )}
              </button>
            </div>

            {createComment.isPending && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Loader2 size={12} className="animate-spin" />
                댓글을 반영하는 중입니다...
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
