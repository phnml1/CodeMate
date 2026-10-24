"use client"

import type { FormEvent } from "react"
import { Loader2, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { useCollaborationMessageEditor } from "@/hooks/useCollaborationMessages"
import type { CollaborationCodeReference, CollaborationMessage } from "@/types/collaboration"

type MessageEditor = ReturnType<typeof useCollaborationMessageEditor>

export default function CollaborationMessageBody({
  message,
  currentUserId,
  canManage,
  variant,
  editor,
  onOpenCodeReference,
}: {
  message: CollaborationMessage
  currentUserId: string
  canManage: boolean
  variant: "bubble" | "inline"
  editor: MessageEditor
  onOpenCodeReference?: (reference: CollaborationCodeReference, messageId: string) => void
}) {
  const isMine = message.authorId === currentUserId
  const editing = editor.editingMessageId === message.id
  const deleting = editor.deletingMessageId === message.id
  const manageable = isMine && canManage && !message.deliveryStatus
  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void editor.save()
  }

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
      </div>
    ) : (
      <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-800 dark:text-slate-100">{message.content}</p>
    )}
    {manageable && !editing && (
      <div className="mt-1 flex items-center gap-1">
        <Button type="button" size="icon-xs" variant="ghost" title="메시지 수정" aria-label="메시지 수정" disabled={deleting} onClick={() => editor.begin(message)}><Pencil /></Button>
        <Button type="button" size="icon-xs" variant="ghost" title="메시지 삭제" aria-label="메시지 삭제" disabled={deleting} onClick={() => void editor.remove(message.id)}>
          {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
        </Button>
      </div>
    )}
    {editor.error?.messageId === message.id && <p role="alert" className="mt-1 text-xs text-rose-600">{editor.error.text}</p>}
  </>
}
