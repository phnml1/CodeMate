"use client"

import { InfiniteScrollTrigger } from "@/components/ui/InfiniteScrollTrigger"
import type { CommentWithPR } from "@/types/comment"
import CommentCard from "./CommentCard"
import CommentCardSkeleton from "./CommentCardSkeleton"

interface AllCommentListProps {
  comments: CommentWithPR[]
  isLoading: boolean
  isError: boolean
  hasNextPage: boolean | undefined
  isFetchingNextPage: boolean
  onLoadMore: () => void
  onClickComment: (comment: CommentWithPR) => void
}

export default function AllCommentList({
  comments,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onClickComment,
}: AllCommentListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CommentCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="py-20 text-center text-sm text-slate-400 font-medium">
        댓글 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
      </div>
    )
  }

  if (comments.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-slate-400 font-medium">댓글이 없습니다</p>
        <p className="text-xs text-slate-300 mt-1">PR 상세 페이지에서 댓글을 작성해보세요.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {comments.map((comment, index) => (
        <CommentCard
          key={comment.id}
          comment={comment}
          onClick={onClickComment}
          animationDelay={index * 50}
        />
      ))}

      <InfiniteScrollTrigger
        onLoadMore={onLoadMore}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        loadingFallback={
          <div className="space-y-4">
            <CommentCardSkeleton />
            <CommentCardSkeleton />
          </div>
        }
      />
    </div>
  )
}
