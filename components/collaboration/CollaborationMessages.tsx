"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { Check, Loader2, MessageSquare, RotateCcw, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import TypingIndicator from "@/components/comment/TypingIndicator"
import { useCollaborationTyping } from "@/hooks/useCollaborationTyping"
import type { CollaborationTypingAnchor } from "@/lib/socket/types"
import {
  useCollaborationMessages,
  useCreateCollaborationMessage,
} from "@/hooks/useCollaborationMessages"
import type { CollaborationCodeReference, CollaborationMessage } from "@/types/collaboration"

const MAX_MESSAGE_LENGTH = 4000

interface CollaborationMessagesProps {
  roomId: string
  currentUserId: string
  canSend: boolean
  workspace?: boolean
  visible?: boolean
  onClose?: () => void
  selectedCodeReference?: CollaborationCodeReference | null
  onClearSelection?: () => void
  onOpenCodeReference?: (reference: CollaborationCodeReference, messageId: string) => void
  publishTyping: (anchor: CollaborationTypingAnchor | null, isTyping: boolean) => void
  typingNames: string[]
  messages: CollaborationMessage[]
  messagesQuery: ReturnType<typeof useCollaborationMessages>
}

export default function CollaborationMessages({
  roomId,
  currentUserId,
  canSend,
  workspace = false,
  visible = true,
  onClose,
  selectedCodeReference,
  onClearSelection,
  onOpenCodeReference,
  publishTyping,
  typingNames,
  messages,
  messagesQuery,
}: CollaborationMessagesProps) {
  const [draft, setDraft] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const previousNewestIdRef = useRef<string | undefined>(undefined)
  const restoreHeightRef = useRef<number | null>(null)
  const createMessage = useCreateCollaborationMessage(roomId, currentUserId)
  const typingAnchor = useMemo(() => selectedCodeReference?.baseSha && selectedCodeReference.headSha ? {
    filePath: selectedCodeReference.filePath,
    side: selectedCodeReference.side,
    startLine: selectedCodeReference.startLine,
    baseSha: selectedCodeReference.baseSha,
    headSha: selectedCodeReference.headSha,
  } : null, [selectedCodeReference])
  const { updateTyping, stopTyping } = useCollaborationTyping({ canSend, anchor: typingAnchor, publishTyping })
  const newestMessageId = messages.at(-1)?.id
  const lastOwnMessageId = messages.findLast((message) => message.authorId === currentUserId)?.id

  useEffect(() => {
    if (!visible) return
    const frame = window.requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      inputRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [visible])

  useLayoutEffect(() => {
    if (!visible || !newestMessageId || previousNewestIdRef.current === newestMessageId) return
    previousNewestIdRef.current = newestMessageId
    restoreHeightRef.current = null
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [newestMessageId, visible])

  useLayoutEffect(() => {
    if (scrollRef.current && restoreHeightRef.current !== null) {
      scrollRef.current.scrollTop += scrollRef.current.scrollHeight - restoreHeightRef.current
      restoreHeightRef.current = null
    }
  }, [messagesQuery.data?.pages.length])

  const handleLoadOlder = () => {
    restoreHeightRef.current = scrollRef.current?.scrollHeight ?? null
    void messagesQuery.fetchNextPage()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || content.length > MAX_MESSAGE_LENGTH || !canSend) {
      return
    }
    createMessage.mutate({
      content,
      clientMessageId: crypto.randomUUID(),
      ...(selectedCodeReference ? { codeReference: selectedCodeReference } : {}),
    })
    stopTyping()
    setDraft("")
  }

  return (
    <div className={workspace
      ? "flex h-full min-h-0 flex-col bg-white dark:bg-slate-950"
      : "border-t border-slate-200 dark:border-slate-800"}>
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <MessageSquare size={16} className="text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          방 메시지
        </h3>
        {onClose && <Button type="button" variant="ghost" size="icon-sm" className="ml-auto" title="대화 닫기" aria-label="대화 닫기" onClick={onClose}><X /></Button>}
      </div>

      <div
        ref={scrollRef}
        role="log"
        aria-label="협업방 메시지"
        className={workspace
          ? "mt-3 min-h-0 flex-1 overflow-y-auto px-4 pb-3"
          : "mt-3 h-72 overflow-y-auto px-4 pb-3"}
      >
        {messagesQuery.hasNextPage && (
          <div className="mb-3 text-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={messagesQuery.isFetchingNextPage}
              onClick={handleLoadOlder}
            >
              {messagesQuery.isFetchingNextPage && <Loader2 className="animate-spin" />}
              이전 메시지
            </Button>
          </div>
        )}

        {messagesQuery.isPending ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            <Loader2 className="mr-2 size-4 animate-spin" />
            메시지를 불러오는 중
          </div>
        ) : messagesQuery.isError && messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-rose-600">
            메시지를 불러오지 못했습니다.
            <Button type="button" variant="outline" size="sm" onClick={() => void messagesQuery.refetch()}>
              다시 시도
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            첫 메시지를 남겨 보세요.
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const isMine = message.authorId === currentUserId
              return (
                <div
                  key={message.id}
                  className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                >
                  <div className="mb-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{message.author.name ?? "알 수 없는 사용자"}</span>
                    <time dateTime={message.createdAt}>
                      {new Intl.DateTimeFormat("ko-KR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(message.createdAt))}
                    </time>
                  </div>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm ${
                      isMine
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {message.content}
                    {message.codeReference && (
                      <button
                        type="button"
                        onClick={() => onOpenCodeReference?.(message.codeReference!, message.id)}
                        disabled={!onOpenCodeReference}
                        className="mt-1 block max-w-full truncate text-left text-xs underline underline-offset-2 disabled:no-underline"
                      >
                        {message.codeReference.filePath}:{message.codeReference.startLine}
                        {message.codeReference.endLine !== message.codeReference.startLine && `-${message.codeReference.endLine}`}
                      </button>
                    )}
                  </div>
                  {isMine && (message.deliveryStatus === "sending" || message.deliveryStatus === "failed" || message.id === lastOwnMessageId) && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400" aria-label={message.deliveryStatus === "sending" ? "전송 중" : message.deliveryStatus === "failed" ? "전송 실패" : "전송 완료"}>
                      {message.deliveryStatus === "sending" ? <><Loader2 className="size-3 animate-spin" /> 전송 중</> : message.deliveryStatus === "failed" ? (
                        <button type="button" disabled={!canSend} onClick={() => createMessage.mutate({ content: message.content, codeReference: message.codeReference ?? undefined, clientMessageId: message.clientMessageId! })} className="flex items-center gap-1 text-rose-600 hover:underline disabled:opacity-50">
                          <RotateCcw className="size-3" /> 전송 실패 · 재시도
                        </button>
                      ) : <><Check className="size-3" /> 전송됨</>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {typingNames.length > 0 && <div className="px-4 pb-2"><TypingIndicator names={typingNames} /></div>}

      <form onSubmit={(event) => void handleSubmit(event)} className="border-t border-slate-200 p-4 dark:border-slate-800">
        {selectedCodeReference && (
          <div className="mb-2 flex min-w-0 items-center gap-2 border-l-2 border-emerald-600 bg-emerald-50 px-2 py-1.5 text-xs text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200">
            <span className="min-w-0 flex-1 truncate">
              {selectedCodeReference.filePath}:{selectedCodeReference.startLine}
              {selectedCodeReference.endLine !== selectedCodeReference.startLine && `-${selectedCodeReference.endLine}`}
            </span>
            <Button type="button" size="icon-xs" variant="ghost" title="코드 선택 해제" aria-label="코드 선택 해제" onClick={onClearSelection}>
              <X />
            </Button>
          </div>
        )}
        <label htmlFor={`collaboration-message-${roomId}`} className="sr-only">
          메시지 입력
        </label>
        <Textarea
          ref={inputRef}
          id={`collaboration-message-${roomId}`}
          value={draft}
          onChange={(event) => { setDraft(event.target.value); updateTyping(event.target.value) }}
          onBlur={stopTyping}
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={!canSend}
          placeholder={canSend ? "메시지 입력" : "방에 연결되면 메시지를 보낼 수 있습니다"}
          className="min-h-16 resize-y"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }
          }}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {draft.length}/{MAX_MESSAGE_LENGTH}
          </span>
          <Button type="submit" size="sm" disabled={!canSend || !draft.trim()}>
            <Send />
            보내기
          </Button>
        </div>
        {messagesQuery.isError && messages.length > 0 && (
          <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">
            메시지 갱신에 실패했습니다.
          </p>
        )}
      </form>
    </div>
  )
}
