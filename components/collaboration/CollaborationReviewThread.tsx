"use client"

import { useState, type FormEvent } from "react"
import { Check, Loader2, RotateCcw, Send } from "lucide-react"
import CollaborationMessageBody, { CollaborationMessageActions } from "@/components/collaboration/CollaborationMessageBody"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  useCollaborationMessageEditor,
  useCreateCollaborationMessage,
} from "@/hooks/useCollaborationMessages"
import type { CollaborationMessage } from "@/types/collaboration"

const MAX_MESSAGE_LENGTH = 4000

export default function CollaborationReviewThread({
  roomId,
  reviewId,
  issueIndex,
  currentUserId,
  canSend,
  messages,
  isPending,
  isError,
  onRetry,
}: {
  roomId: string
  reviewId: string
  issueIndex: number | null
  currentUserId: string
  canSend: boolean
  messages: CollaborationMessage[]
  isPending: boolean
  isError: boolean
  onRetry: () => void
}) {
  const [draft, setDraft] = useState("")
  const createMessage = useCreateCollaborationMessage(roomId, currentUserId)
  const messageEditor = useCollaborationMessageEditor(roomId)
  const reviewReference = { reviewId, issueIndex }
  const lastOwnMessageId = messages.findLast(
    (message) => message.authorId === currentUserId
  )?.id

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || content.length > MAX_MESSAGE_LENGTH || !canSend) return
    createMessage.mutate({
      content,
      reviewReference,
      clientMessageId: crypto.randomUUID(),
    })
    setDraft("")
  }

  return (
    <div className="border-t border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900 dark:bg-violet-950/20">
      <div role="log" aria-label="AI 리뷰 대화" className="max-h-72 space-y-3 overflow-y-auto">
        {isPending ? (
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="size-3 animate-spin" /> 대화를 불러오는 중
          </p>
        ) : isError ? (
          <div className="flex items-center gap-2 text-xs text-rose-600">
            대화를 불러오지 못했습니다.
            <Button type="button" size="xs" variant="ghost" onClick={onRetry}>
              다시 시도
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            아직 코멘트가 없습니다.
          </p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="text-xs">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {message.author.name ?? "알 수 없는 사용자"}
                  {message.authorId === currentUserId ? " (나)" : ""}
                </span>
                <time dateTime={message.createdAt}>
                  {new Intl.DateTimeFormat("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(message.createdAt))}
                </time>
                {!message.deliveryStatus && message.updatedAt !== message.createdAt && (
                  <span>(수정됨)</span>
                )}
                <CollaborationMessageActions
                  message={message}
                  currentUserId={currentUserId}
                  canManage={canSend}
                  editor={messageEditor}
                />
              </div>
              <CollaborationMessageBody
                message={message}
                currentUserId={currentUserId}
                canManage={canSend}
                variant="inline"
                editor={messageEditor}
              />
              {message.authorId === currentUserId &&
                (message.deliveryStatus === "sending" ||
                  message.deliveryStatus === "failed" ||
                  message.id === lastOwnMessageId) && (
                  <div
                    className="mt-1 flex items-center gap-1 text-[11px] text-slate-500"
                    aria-label={
                      message.deliveryStatus === "sending"
                        ? "전송 중"
                        : message.deliveryStatus === "failed"
                          ? "전송 실패"
                          : "전송 완료"
                    }
                  >
                    {message.deliveryStatus === "sending" ? (
                      <><Loader2 className="size-3 animate-spin" /> 전송 중</>
                    ) : message.deliveryStatus === "failed" ? (
                      <button
                        type="button"
                        disabled={!canSend}
                        onClick={() => createMessage.mutate({
                          content: message.content,
                          reviewReference,
                          clientMessageId: message.clientMessageId!,
                        })}
                        className="flex items-center gap-1 text-rose-600 hover:underline disabled:opacity-50"
                      >
                        <RotateCcw className="size-3" /> 전송 실패 · 재시도
                      </button>
                    ) : (
                      <><Check className="size-3" /> 전송됨</>
                    )}
                  </div>
                )}
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 border-t border-violet-200 pt-3 dark:border-violet-900">
        <label className="sr-only" htmlFor={`review-comment-${reviewId}-${issueIndex ?? "overall"}`}>
          AI 리뷰 코멘트
        </label>
        <Textarea
          id={`review-comment-${reviewId}-${issueIndex ?? "overall"}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={!canSend}
          placeholder={canSend ? "AI 리뷰에 대한 코멘트 입력" : "방에 연결되면 코멘트를 남길 수 있습니다"}
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
            <Send /> 보내기
          </Button>
        </div>
      </form>
    </div>
  )
}
