import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  appendCommentToThread,
  findCommentInThread,
  normalizeComment,
  toggleReactionForUser,
  updateCommentReactionsInThread,
} from "@/lib/comments/cache"
import { useSocketState } from "./useSocket"
import type {
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
  if (!res.ok) throw new Error("Failed to load comments.")
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
  if (!res.ok) throw new Error("Failed to load comments.")
  const data = await res.json()
  return (data.comments as CommentWithAuthor[]).map(normalizeComment)
}

export function useComments(prId: string) {
  return useQuery({
    queryKey: ["comments", prId],
    queryFn: () => fetchComments(prId),
  })
}

export function useCreateComment(prId: string) {
  const queryClient = useQueryClient()
  const { fallbackActive, realtimeEnabled } = useSocketState()
  const shouldPatchCommentCache = !realtimeEnabled || fallbackActive

  return useMutation({
    mutationFn: async (input: CreateCommentInput) => {
      const res = await fetch(`/api/pulls/${prId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error("Failed to create comment.")
      const data = await res.json()
      return normalizeComment(data.comment as CommentWithAuthor)
    },
    onSuccess: (comment) => {
      if (!shouldPatchCommentCache) return

      queryClient.setQueryData<CommentWithAuthor[]>(["comments", prId], (old) =>
        old ? appendCommentToThread(old, comment) : [comment]
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
      if (!res.ok) throw new Error("Failed to update comment.")
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
      if (!res.ok) throw new Error("Failed to delete comment.")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", prId] })
    },
  })
}

export function useToggleReaction(prId: string, currentUserId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ commentId, emoji }: { commentId: string; emoji: ReactionEmoji }) => {
      const res = await fetch(`/api/comments/${commentId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      })
      if (!res.ok) throw new Error("Failed to toggle reaction.")
      const data = await res.json()
      return normalizeComment(data.comment as CommentWithAuthor)
    },
    onMutate: async ({ commentId, emoji }) => {
      await queryClient.cancelQueries({ queryKey: ["comments", prId] })

      const previousComments = queryClient.getQueryData<CommentWithAuthor[]>([
        "comments",
        prId,
      ])

      if (!previousComments) {
        return { previousComments }
      }

      const targetComment = findCommentInThread(previousComments, commentId)
      if (!targetComment) {
        return { previousComments }
      }

      const nextReactions = toggleReactionForUser(
        targetComment.reactions ?? {},
        emoji,
        currentUserId
      )

      queryClient.setQueryData<CommentWithAuthor[]>(["comments", prId], (old) =>
        old ? updateCommentReactionsInThread(old, commentId, nextReactions) : old
      )

      return { previousComments }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(["comments", prId], context.previousComments)
      }
    },
    onSuccess: (comment) => {
      queryClient.setQueryData<CommentWithAuthor[]>(["comments", prId], (old) =>
        old
          ? updateCommentReactionsInThread(old, comment.id, comment.reactions ?? {})
          : old
      )
    },
  })
}

export function useToggleResolve(prId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`/api/comments/${commentId}/resolve`, { method: "PATCH" })
      if (!res.ok) throw new Error("Failed to resolve comment.")
      const data = await res.json()
      return data.comment as CommentWithAuthor
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", prId] })
    },
  })
}
