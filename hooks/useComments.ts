import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  CommentAuthor,
  CommentWithAuthor,
  CommentsListResponse,
  CreateCommentInput,
  ReactionEmoji,
  UpdateCommentInput,
} from "@/types/comment"

export interface CommentsFilter {
  repoId?: string
  prId?: string
  authorId?: string
}

type OptimisticUser = {
  id: string
  name?: string | null
  image?: string | null
}

async function fetchAllCommentsPage(
  filter: CommentsFilter,
  page: number
): Promise<CommentsListResponse> {
  const params = new URLSearchParams()
  if (filter.repoId) params.set("repoId", filter.repoId)
  if (filter.prId) params.set("prId", filter.prId)
  if (filter.authorId) params.set("authorId", filter.authorId)
  params.set("page", String(page))
  params.set("limit", "20")

  const res = await fetch(`/api/comments?${params}`)
  if (!res.ok) throw new Error("댓글을 불러오지 못했습니다.")
  return res.json()
}

export function useAllComments(filter: CommentsFilter) {
  return useInfiniteQuery({
    queryKey: ["allComments", filter],
    queryFn: ({ pageParam }) => fetchAllCommentsPage(filter, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination
      return page < totalPages ? page + 1 : undefined
    },
  })
}

async function fetchComments(prId: string): Promise<CommentWithAuthor[]> {
  const res = await fetch(`/api/pulls/${prId}/comments`)
  if (!res.ok) throw new Error("댓글을 불러오지 못했습니다.")
  const data = await res.json()
  return data.comments
}

function appendComment(
  comments: CommentWithAuthor[],
  comment: CommentWithAuthor
): CommentWithAuthor[] {
  if (comment.parentId == null) {
    if (comments.some((item) => item.id === comment.id)) return comments
    return [...comments, comment]
  }

  return comments.map((item) => {
    if (item.id === comment.parentId) {
      if (item.replies.some((reply) => reply.id === comment.id)) return item
      return { ...item, replies: [...item.replies, comment] }
    }

    if (item.replies.length === 0) return item
    return { ...item, replies: appendComment(item.replies, comment) }
  })
}

function replaceComment(
  comments: CommentWithAuthor[],
  targetId: string,
  nextComment: CommentWithAuthor
): CommentWithAuthor[] {
  let replaced = false

  const walk = (items: CommentWithAuthor[]): CommentWithAuthor[] =>
    items.map((item) => {
      if (item.id === targetId) {
        replaced = true
        return nextComment
      }

      if (item.replies.length === 0) return item

      const nextReplies = walk(item.replies)
      return nextReplies === item.replies ? item : { ...item, replies: nextReplies }
    })

  const updated = walk(comments)
  return replaced ? updated : appendComment(updated, nextComment)
}

export function useComments(prId: string) {
  return useQuery({
    queryKey: ["comments", prId],
    queryFn: () => fetchComments(prId),
  })
}

export function useCreateComment(prId: string, optimisticUser?: OptimisticUser) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateCommentInput) => {
      const res = await fetch(`/api/pulls/${prId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error("댓글 작성에 실패했습니다.")
      const data = await res.json()
      return data.comment as CommentWithAuthor
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["comments", prId] })

      const previousComments =
        queryClient.getQueryData<CommentWithAuthor[]>(["comments", prId]) ?? []

      const optimisticId = `optimistic-comment-${Date.now()}`
      const now = new Date().toISOString()
      const author: CommentAuthor = {
        id: optimisticUser?.id ?? "optimistic-user",
        name: optimisticUser?.name ?? "나",
        image: optimisticUser?.image ?? null,
      }

      const optimisticComment: CommentWithAuthor = {
        id: optimisticId,
        content: input.content.trim(),
        lineNumber: input.lineNumber ?? null,
        filePath: input.filePath ?? null,
        isResolved: false,
        pullRequestId: prId,
        authorId: author.id,
        parentId: input.parentId ?? null,
        mentions: input.mentions ?? [],
        reactions: {},
        createdAt: now,
        updatedAt: now,
        author,
        replies: [],
      }

      queryClient.setQueryData<CommentWithAuthor[]>(["comments", prId], (old = []) =>
        appendComment(old, optimisticComment)
      )

      return { previousComments, optimisticId }
    },
    onError: (_error, _input, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(["comments", prId], context.previousComments)
      }
    },
    onSuccess: (comment, _input, context) => {
      queryClient.setQueryData<CommentWithAuthor[]>(["comments", prId], (old = []) =>
        replaceComment(old, context?.optimisticId ?? "", comment)
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", prId] })
    },
  })
}

export function useUpdateComment(prId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ commentId, input }: { commentId: string; input: UpdateCommentInput }) => {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error("댓글 수정에 실패했습니다.")
      const data = await res.json()
      return data.comment as CommentWithAuthor
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", prId] })
    },
  })
}

export function useDeleteComment(prId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("댓글 삭제에 실패했습니다.")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", prId] })
    },
  })
}

export function useToggleReaction(prId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ commentId, emoji }: { commentId: string; emoji: ReactionEmoji }) => {
      const res = await fetch(`/api/comments/${commentId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      })
      if (!res.ok) throw new Error("반응 추가에 실패했습니다.")
      const data = await res.json()
      return data.comment as CommentWithAuthor
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", prId] })
    },
  })
}

export function useToggleResolve(prId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`/api/comments/${commentId}/resolve`, { method: "PATCH" })
      if (!res.ok) throw new Error("resolve 토글에 실패했습니다.")
      const data = await res.json()
      return data.comment as CommentWithAuthor
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", prId] })
    },
  })
}
