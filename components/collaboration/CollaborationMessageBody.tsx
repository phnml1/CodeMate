"use client"

import type { FormEvent } from "react"
import { Check, Loader2, Pencil, RotateCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { useCollaborationMessageEditor } from "@/hooks/useCollaborationMessages"
import type { CollaborationCodeReference, CollaborationMessage } from "@/types/collaboration"

type MessageEditor = ReturnType<typeof useCollaborationMessageEditor>

export function CollaborationMessageActions({
  message,
  currentUserId,
  canManage,
  editor,
}: {
  message: CollaborationMessage
  currentUserId: string
  canManage: boolean
  editor: MessageEditor
}) {
  if (message.authorId !== currentUserId || !canManage || message.deliveryStatus || editor.editingMessageId === message.id) return null

  const deleting = editor.deletingMessageId === message.id
  return (
    <div className="ml-1 flex shrink-0 items-center gap-1">
      <Button type="button" size="icon-xs" variant="ghost" title="메시지 수정" aria-label="메시지 수정" disabled={deleting} onClick={() => editor.begin(message)}><Pencil /></Button>
      <Button type="button" size="icon-xs" variant="ghost" title="메시지 삭제" aria-label="메시지 삭제" disabled={deleting} onClick={() => void editor.remove(message.id)}>
        {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
      </Button>
    </div>
  )
}

export default function CollaborationMessageBody({
  message,
  currentUserId,
  canManage,
  variant,
  editor,
  onOpenCodeReference,
  showDeliveryStatus = false,
  onRetry,
}: {
  message: CollaborationMessage
  currentUserId: string
  canManage: boolean
  variant: "bubble" | "inline"
  editor: MessageEditor
  onOpenCodeReference?: (reference: CollaborationCodeReference, messageId: string) => void
  showDeliveryStatus?: boolean
  onRetry?: () => void
}) {
  const isMine = message.authorId === currentUserId
  const editing = editor.editingMessageId === message.id
  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void editor.save()
  }
  const deliveryStatus = showDeliveryStatus && !editing && (
    <span
      data-delivery-status
      aria-label={message.deliveryStatus === "sending" ? "전송 중" : message.deliveryStatus === "failed" ? "전송 실패" : "전송 완료"}
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] ${variant === "bubble" ? "text-white/80" : "text-slate-500 dark:text-slate-400"}`}
    >
      {message.deliveryStatus === "sending" ? <><Loader2 className="size-3 animate-spin" /> 전송 중</> : message.deliveryStatus === "failed" ? (
        <button type="button" disabled={!canManage} onClick={onRetry} className={`inline-flex items-center gap-1 hover:underline disabled:opacity-50 ${variant === "bubble" ? "text-rose-100" : "text-rose-600"}`}>
          <RotateCcw className="size-3" /> 전송 실패 · 재시도
        </button>
      ) : <><Check className="size-3" /> 전송됨</>}
    </span>
  )

  return <>
    {editing ? (
      <form onSubmit={handleSave} className={variant === "bubble" ? "w-[85%] min-w-0" : "w-full min-w-0"}>
        <Textarea
          autoFocus
          aria-label="메시지 수정"
          value={editor.draft}
          onChange={(event) => editor.setDraft(event.target.value)}
          maxLength={4000}
          disabled={editor.isSaving}
          className="box-border min-h-20 w-full min-w-0 resize-y bg-white dark:bg-slate-950"
          onKeyDown={(event) => {
            if (event.key === "Escape") editor.cancel()
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }
          }}
        />
        <div className="mt-1 flex justify-end gap-1">
          <Button type="button" size="xs" variant="ghost" disabled={editor.isSaving} onClick={editor.cancel}>취소</Button>
          <Button type="submit" size="xs" disabled={editor.isSaving || !editor.draft.trim()}>
            {editor.isSaving && <Loader2 className="animate-spin" />}저장
          </Button>
        </div>
      </form>
    ) : variant === "bubble" ? (
      <div className={`max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm ${isMine ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"}`}>
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
        {deliveryStatus && <div className="mt-1 flex justify-end">{deliveryStatus}</div>}
      </div>
    ) : (
      <div className="mt-0.5 flex min-w-0 flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm text-slate-800 dark:text-slate-100">{message.content}</p>
        {deliveryStatus}
      </div>
    )}
    {editor.error?.messageId === message.id && <p role="alert" className="mt-1 text-xs text-rose-600">{editor.error.text}</p>}
  </>
}
