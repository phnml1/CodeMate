"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { Check, Loader2, MessageSquare, RotateCcw, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import TypingIndicator from "@/components/comment/TypingIndicator"
import { useCollaborationCodeThread } from "@/hooks/useCollaborationCodeThreads"
import { useCreateCollaborationMessage } from "@/hooks/useCollaborationMessages"
import { useCollaborationTyping } from "@/hooks/useCollaborationTyping"
import type { CollaborationTypingAnchor } from "@/lib/socket/types"
import type { CollaborationCodeAnchor } from "@/types/collaboration"

const MAX_MESSAGE_LENGTH = 4000

export default function InlineCollaborationThread({
  roomId,
  anchor,
  currentUserId,
  canSend,
  focusComposer,
  targetMessageId,
  typingNames,
  publishTyping,
  onClose,
}: {
  roomId: string
  anchor: CollaborationCodeAnchor
  currentUserId: string
  canSend: boolean
  focusComposer: boolean
  targetMessageId: string | null
  typingNames: string[]
  publishTyping: (anchor: CollaborationTypingAnchor | null, isTyping: boolean) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const newestMessageRef = useRef<HTMLDivElement>(null)
  const targetMessageRef = useRef<HTMLDivElement>(null)
  const scrolledTargetIdRef = useRef<string | null>(null)
  const restoreHeightRef = useRef<number | null>(null)
  const threadQuery = useCollaborationCodeThread(roomId, anchor)
  const createMessage = useCreateCollaborationMessage(roomId, currentUserId)
  const typingAnchor = useMemo(() => ({
    filePath: anchor.filePath,
    side: anchor.side,
    startLine: anchor.startLine,
    baseSha: anchor.baseSha,
    headSha: anchor.headSha,
  }), [anchor])
  const { updateTyping, stopTyping } = useCollaborationTyping({ canSend, anchor: typingAnchor, publishTyping })
  const messages = useMemo(
    () => threadQuery.data?.pages.slice().reverse().flatMap((page) => page.messages) ?? [],
    [threadQuery.data]
  )
  const lastOwnMessageId = messages.findLast((message) => message.authorId === currentUserId)?.id
  const newestMessageId = messages.at(-1)?.id

  useLayoutEffect(() => {
    if (targetMessageId && scrolledTargetIdRef.current !== targetMessageId && targetMessageRef.current) {
      scrolledTargetIdRef.current = targetMessageId
      restoreHeightRef.current = null
      targetMessageRef.current.scrollIntoView({ block: "nearest", inline: "nearest" })
      return
    }
    if (newestMessageId && scrollRef.current) {
      restoreHeightRef.current = null
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      newestMessageRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" })
    }
  }, [newestMessageId, targetMessageId])

  useLayoutEffect(() => {
    if (scrollRef.current && restoreHeightRef.current !== null) {
      scrollRef.current.scrollTop += scrollRef.current.scrollHeight - restoreHeightRef.current
      restoreHeightRef.current = null
    }
  }, [threadQuery.data?.pages.length])

  useEffect(() => {
    if (focusComposer && canSend) inputRef.current?.focus()
  }, [canSend, focusComposer])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || content.length > MAX_MESSAGE_LENGTH || !canSend) return

    createMessage.mutate({
      content,
      clientMessageId: crypto.randomUUID(),
      codeReference: {
        filePath: anchor.filePath,
        side: anchor.side,
        startLine: anchor.startLine,
        endLine: anchor.endLine,
        baseSha: anchor.baseSha,
        headSha: anchor.headSha,
      },
    })
    stopTyping()
    setDraft("")
  }

  return (
    <section data-collaboration-thread aria-label={`${anchor.startLine}번 줄 협업방 대화`} className="border-y border-emerald-200 bg-emerald-50/70 px-4 py-3 font-sans dark:border-emerald-900 dark:bg-emerald-950/30">
      <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
        <MessageSquare className="size-4 text-emerald-700 dark:text-emerald-400" />
        <h3 className="font-semibold">협업방 대화</h3>
        <span className="text-slate-500 dark:text-slate-400">
          {anchor.side === "LEFT" ? "이전" : "변경"} {anchor.startLine}
          {anchor.endLine !== anchor.startLine && `-${anchor.endLine}`}
        </span>
        <Button type="button" variant="ghost" size="icon-xs" className="ml-auto" title="대화 닫기" aria-label="대화 닫기" onClick={onClose}>
          <X />
        </Button>
      </div>

      <div ref={scrollRef} role="log" aria-label="이 줄의 대화" className="mt-3 max-h-64 space-y-3 overflow-y-auto">
        {threadQuery.hasNextPage && (
          <Button type="button" size="xs" variant="ghost" disabled={threadQuery.isFetchingNextPage} onClick={() => {
            restoreHeightRef.current = scrollRef.current?.scrollHeight ?? null
            void threadQuery.fetchNextPage()
          }}>
            {threadQuery.isFetchingNextPage && <Loader2 className="animate-spin" />}
            이전 대화
          </Button>
        )}
        {threadQuery.isPending ? (
          <p className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="size-3 animate-spin" /> 대화를 불러오는 중</p>
        ) : threadQuery.isError ? (
          <div className="flex items-center gap-2 text-xs text-rose-600">
            대화를 불러오지 못했습니다.
            <Button type="button" size="xs" variant="ghost" onClick={() => void threadQuery.refetch()}>다시 시도</Button>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">아직 이 줄의 대화가 없습니다.</p>
        ) : messages.map((message) => (
          <div key={message.id} ref={message.id === targetMessageId ? targetMessageRef : message.id === newestMessageId ? newestMessageRef : undefined} data-collaboration-message-id={message.id} className={`text-xs ${message.id === targetMessageId ? "border-l-2 border-emerald-600 bg-emerald-100/70 pl-2 dark:bg-emerald-900/40" : ""}`}>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {message.author.name ?? "알 수 없는 사용자"}{message.authorId === currentUserId && message.author.name !== "나" ? " (나)" : ""}
              </span>
              <time dateTime={message.createdAt}>
                {new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.createdAt))}
              </time>
            </div>
            <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-800 dark:text-slate-100">{message.content}</p>
            {message.authorId === currentUserId && (message.deliveryStatus === "sending" || message.deliveryStatus === "failed" || message.id === lastOwnMessageId) && (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400" aria-label={message.deliveryStatus === "sending" ? "전송 중" : message.deliveryStatus === "failed" ? "전송 실패" : "전송 완료"}>
                {message.deliveryStatus === "sending" ? <><Loader2 className="size-3 animate-spin" /> 전송 중</> : message.deliveryStatus === "failed" ? (
                  <button type="button" disabled={!canSend} onClick={() => createMessage.mutate({ content: message.content, codeReference: message.codeReference ?? undefined, clientMessageId: message.clientMessageId! })} className="flex items-center gap-1 text-rose-600 hover:underline disabled:opacity-50">
                    <RotateCcw className="size-3" /> 전송 실패 · 재시도
                  </button>
                ) : <><Check className="size-3" /> 전송됨</>}
              </div>
            )}
          </div>
        ))}
      </div>

      {typingNames.length > 0 && <div className="mt-2"><TypingIndicator names={typingNames} /></div>}

      <form onSubmit={(event) => void handleSubmit(event)} className="mt-3 border-t border-emerald-200 pt-3 dark:border-emerald-900">
        <label htmlFor={`inline-collaboration-${roomId}-${anchor.side}-${anchor.startLine}`} className="sr-only">이 줄에 메시지 입력</label>
        <Textarea
          ref={inputRef}
          id={`inline-collaboration-${roomId}-${anchor.side}-${anchor.startLine}`}
          value={draft}
          onChange={(event) => { setDraft(event.target.value); updateTyping(event.target.value) }}
          onBlur={stopTyping}
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={!canSend}
          placeholder={canSend ? "이 줄에 메시지 입력" : "방에 연결되면 메시지를 보낼 수 있습니다"}
          className="min-h-16 resize-y bg-white dark:bg-slate-950"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }
          }}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500">{draft.length}/{MAX_MESSAGE_LENGTH}</span>
          <Button type="submit" size="sm" disabled={!canSend || !draft.trim()}>
            <Send />
            보내기
          </Button>
        </div>
      </form>
    </section>
  )
}
