"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAllComments } from "@/hooks/useComments"
import AllCommentList from "@/components/comment/AllCommentList"
import CommentFilter from "@/components/comment/CommentFilter"
import CommentsHeader from "@/components/comment/CommentsHeader"
import type { CommentWithPR } from "@/types/comment"
import type { ConnectedRepo } from "@/lib/comments"

interface CommentsClientProps {
  repos: ConnectedRepo[]
  userId?: string
}

export default function CommentsClient({ repos, userId }: CommentsClientProps) {
  const router = useRouter()
  const [selectedRepoId, setSelectedRepoId] = useState<string | undefined>()
  const [myOnly, setMyOnly] = useState(false)

  const filter = useMemo(
    () => ({
      repoId: selectedRepoId,
      authorId: myOnly && userId ? userId : undefined,
    }),
    [selectedRepoId, myOnly, userId]
  )

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useAllComments(filter)

  const comments = useMemo(
    () => data?.pages.flatMap((page) => page.comments) ?? [],
    [data]
  )

  const totalCount = data?.pages[0]?.pagination.total ?? 0

  const handleClickComment = (comment: CommentWithPR) => {
    if (comment.filePath && comment.lineNumber != null) {
      const params = new URLSearchParams({
        filePath: comment.filePath,
        lineNumber: comment.lineNumber.toString(),
      })
      router.push(`/pulls/${comment.pullRequest.id}?${params.toString()}`)
    } else {
      router.push(`/pulls/${comment.pullRequest.id}`)
    }
  }

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <CommentsHeader totalCount={totalCount} isLoading={isLoading} />
        <CommentFilter
          repos={repos}
          selectedRepoId={selectedRepoId}
          myOnly={myOnly}
          onRepoChange={setSelectedRepoId}
          onMyOnlyChange={setMyOnly}
        />
        <AllCommentList
          comments={comments}
          isLoading={isLoading}
          isError={isError}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={fetchNextPage}
          onClickComment={handleClickComment}
        />
      </div>
    </div>
  )
}
