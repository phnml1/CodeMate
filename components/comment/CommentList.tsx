"use client"

import { useCallback, memo } from "react"
import { MessageSquare } from "lucide-react"
import { useCreateComment } from "@/hooks/useComments"
import { useRealtimeComments } from "@/hooks/useRealtimeComments"
import { useTypingIndicator } from "@/hooks/useTypingIndicator"
import CommentInput from "./CommentInput"
import CommentThread from "./CommentThread"
import TypingIndicator from "./TypingIndicator"

interface CommentListProps {
  prId: string
  currentUserId: string
}

const CommentListHeader = memo(function CommentListHeader({
  count,
}: {
  count: number
}) {
  return (
    <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700">
      <MessageSquare size={16} className="text-blue-500" />
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        댓글
      </span>
      {count > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
          {count}
        </span>
      )}
    </div>
  )
})

export default function CommentList({ prId, currentUserId }: CommentListProps) {
  const { data: comments = [], isLoading } = useRealtimeComments(prId)
  const createComment = useCreateComment(prId)
  const { names: typingNames, onTyping, onTypingStop } = useTypingIndicator(prId)

  const handleCreate = useCallback(
    (content: string, mentions: string[]) => {
      createComment.mutate({ content, mentions })
    },
    [createComment]
  )

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <CommentListHeader count={comments.length} />

      <div className="p-4 space-y-4">
        <CommentInput
          onSubmit={handleCreate}
          isLoading={createComment.isPending}
          onTyping={onTyping}
          onTypingStop={onTypingStop}
        />

        <TypingIndicator names={typingNames} />

        {isLoading ? (
          <div className="py-8 text-center text-sm text-slate-400">
            댓글을 불러오는 중...
          </div>
        ) : comments.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            첫 번째 댓글을 작성해보세요.
          </div>
        ) : (
          <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
            {comments.map((comment) => (
              <div key={comment.id} className="pt-4 first:pt-0">
                <CommentThread
                  comment={comment}
                  prId={prId}
                  currentUserId={currentUserId}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
