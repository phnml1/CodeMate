import { useState } from "react"
import { publishGitHubReview } from "@/lib/github-review-client"
import {
  infiniteQueryOptions,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query"
import type {
  CollaborationMessage,
  CollaborationCodeReference,
  CollaborationReviewReference,
  CollaborationMessageResponse,
  CollaborationMessagesResponse,
  CollaborationReviewMessagesResponse,
} from "@/types/collaboration"
import { collaborationReviewMessagesQueryKey } from "@/hooks/useCollaborationReviewThreads"
import { collaborationCodeThreadQueryKey, collaborationCodeThreadsQueryKey } from "@/hooks/useCollaborationCodeThreads"

const MESSAGE_POLL_INTERVAL_MS = 4_000
const CONNECTED_MESSAGE_POLL_INTERVAL_MS = 20_000

export const collaborationMessagesQueryKey = (roomId: string) =>
  ["collaborationMessages", roomId] as const

export interface CreateCollaborationMessageInput {
  content: string
  codeReference?: CollaborationCodeReference
  reviewReference?: CollaborationReviewReference
  clientMessageId: string
  publishToGitHub?: boolean
}

function codeThreadKey(message: CollaborationMessage) {
  const reference = message.codeReference
  if (!reference?.baseSha || !reference.headSha) return null
  return collaborationCodeThreadQueryKey(message.roomId, {
    ...reference,
    baseSha: reference.baseSha,
    headSha: reference.headSha,
  })
}

function upsertMessage(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  message: CollaborationMessage
) {
  queryClient.setQueryData<InfiniteData<CollaborationMessagesResponse, string | null>>(
    queryKey,
    (current) => {
      if (!current?.pages.length) {
        return { pages: [{ messages: [message], nextCursor: null }], pageParams: [null] }
      }
      const matches = (item: CollaborationMessage) =>
        item.id === message.id || Boolean(
          message.clientMessageId && item.authorId === message.authorId &&
          item.clientMessageId === message.clientMessageId
        )
      const found = current.pages.some((page) => page.messages.some(matches))
      return {
        ...current,
        pages: current.pages.map((page, index) => ({
          ...page,
          messages: found
            ? page.messages.map((item) => matches(item) ? message : item)
            : index === 0 ? [...page.messages, message] : page.messages,
        })),
      }
    }
  )
}

function markMessageFailed(queryClient: QueryClient, pending: CollaborationMessage) {
  const queryKeys = [collaborationMessagesQueryKey(pending.roomId), codeThreadKey(pending)]
  for (const queryKey of queryKeys) {
    if (!queryKey) continue
    queryClient.setQueryData<InfiniteData<CollaborationMessagesResponse, string | null>>(
      queryKey,
      (current) => current && {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          messages: page.messages.map((item) =>
            item.id === pending.id ? { ...item, deliveryStatus: "failed" } : item
          ),
        })),
      }
    )
  }
  changeCachedReviewMessage(queryClient, pending.roomId, pending.id, {
    ...pending,
    deliveryStatus: "failed",
  })
}

function upsertReviewMessage(queryClient: QueryClient, message: CollaborationMessage) {
  const reference = message.reviewReference
  if (!reference) return
  queryClient.setQueryData<CollaborationReviewMessagesResponse>(
    collaborationReviewMessagesQueryKey(message.roomId, reference.reviewId),
    (current) => {
      if (!current) return { messages: [message] }
      const matches = (item: CollaborationMessage) =>
        item.id === message.id || Boolean(
          message.clientMessageId && item.authorId === message.authorId &&
          item.clientMessageId === message.clientMessageId
        )
      const found = current.messages.some(matches)
      return {
        messages: found
          ? current.messages.map((item) => matches(item) ? message : item)
          : [...current.messages, message],
      }
    }
  )
}

function changeCachedReviewMessage(
  queryClient: QueryClient,
  roomId: string,
  messageId: string,
  replacement?: CollaborationMessage
) {
  const queries = queryClient.getQueriesData<CollaborationReviewMessagesResponse>({
    queryKey: collaborationReviewMessagesQueryKey(roomId),
  })
  for (const [queryKey, data] of queries) {
    if (!data?.messages) continue
    queryClient.setQueryData<CollaborationReviewMessagesResponse>(queryKey, {
      messages: replacement
        ? data.messages.map((message) => message.id === messageId ? replacement : message)
        : data.messages.filter((message) => message.id !== messageId),
    })
  }
}

function changeCachedMessage(
  queryClient: QueryClient,
  roomId: string,
  messageId: string,
  replacement?: CollaborationMessage
) {
  const roomKey = collaborationMessagesQueryKey(roomId)
  const threadQueries = queryClient.getQueriesData<InfiniteData<CollaborationMessagesResponse, string | null>>({
    queryKey: collaborationCodeThreadsQueryKey(roomId),
  })
  for (const queryKey of [roomKey, ...threadQueries.filter(([, data]) => Array.isArray(data?.pages)).map(([key]) => key)]) {
    queryClient.setQueryData<InfiniteData<CollaborationMessagesResponse, string | null>>(queryKey, (current) => {
      if (!current?.pages) return current
      return {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          messages: replacement
            ? page.messages.map((message) => message.id === messageId ? replacement : message)
            : page.messages.filter((message) => message.id !== messageId),
        })),
      }
    })
  }
}

export function updateCollaborationMessageCache(queryClient: QueryClient, message: CollaborationMessage) {
  changeCachedMessage(queryClient, message.roomId, message.id, message)
  changeCachedReviewMessage(queryClient, message.roomId, message.id, message)
}

export function deleteCollaborationMessageCache(queryClient: QueryClient, roomId: string, messageId: string) {
  changeCachedMessage(queryClient, roomId, messageId)
  changeCachedReviewMessage(queryClient, roomId, messageId)
  void queryClient.invalidateQueries({ queryKey: collaborationCodeThreadsQueryKey(roomId) })
  void queryClient.invalidateQueries({ queryKey: collaborationMessagesQueryKey(roomId) })
}

async function fetchMessages(roomId: string, cursor: string | null) {
  const params = new URLSearchParams({ limit: "50" })
  if (cursor) params.set("cursor", cursor)

  const response = await fetch(
    `/api/collaboration/rooms/${roomId}/messages?${params}`
  )
  if (!response.ok) {
    throw new Error("메시지를 불러오지 못했습니다.")
  }

  return (await response.json()) as CollaborationMessagesResponse
}

export function collaborationMessagesQueryOptions(roomId: string) {
  return infiniteQueryOptions({
    queryKey: collaborationMessagesQueryKey(roomId),
    queryFn: ({ pageParam }) => fetchMessages(roomId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })
}

export function appendCollaborationMessage(
  queryClient: QueryClient,
  message: CollaborationMessage
) {
  const queryKey = collaborationMessagesQueryKey(message.roomId)
  upsertMessage(queryClient, queryKey, message)
  const threadKey = codeThreadKey(message)
  if (threadKey) upsertMessage(queryClient, threadKey, message)
  if (message.codeReference) {
    void queryClient.invalidateQueries({
      queryKey: collaborationCodeThreadsQueryKey(message.roomId),
    })
  }
  upsertReviewMessage(queryClient, message)
}

export function useCollaborationMessages(
  roomId: string | null,
  realtimeConnected: boolean
) {
  return useInfiniteQuery({
    ...collaborationMessagesQueryOptions(roomId ?? ""),
    enabled: Boolean(roomId),
    refetchInterval: roomId
      ? realtimeConnected
        ? CONNECTED_MESSAGE_POLL_INTERVAL_MS
        : MESSAGE_POLL_INTERVAL_MS
      : false,
  })
}

export function useCreateCollaborationMessage(roomId: string, currentUserId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ content, codeReference, reviewReference, clientMessageId, publishToGitHub }: CreateCollaborationMessageInput) => {
      const response = await fetch(
        `/api/collaboration/rooms/${roomId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, codeReference, reviewReference, clientMessageId, publishToGitHub }),
        }
      )
      if (!response.ok) {
        throw new Error("메시지를 보내지 못했습니다. 다시 시도해 주세요.")
      }

      const result = (await response.json()) as CollaborationMessageResponse
      if (!publishToGitHub || !result.message.reviewCommentId) return result
      appendCollaborationMessage(queryClient, {
        ...result.message,
        githubStatus: "PUBLISHING",
        githubStatusUpdatedAt: new Date().toISOString(),
      })
      try {
        const published = await publishGitHubReview(result.message.reviewCommentId)
        return { message: { ...result.message, githubStatus: "PUBLISHED" as const, githubReviewUrl: published.url ?? null } }
      } catch (error) {
        return { message: { ...result.message, githubStatus: "FAILED" as const, githubError: error instanceof Error ? error.message : "GitHub 리뷰 전송에 실패했습니다." } }
      }
    },
    onMutate: async ({ content, codeReference, reviewReference, clientMessageId, publishToGitHub }) => {
      const pending: CollaborationMessage = {
        id: `pending:${clientMessageId}`,
        roomId,
        authorId: currentUserId,
        author: { id: currentUserId, name: "나", image: null },
        content,
        clientMessageId,
        codeReference: codeReference ?? null,
        reviewReference: reviewReference ?? null,
        githubStatus: publishToGitHub ? "PUBLISHING" : "NOT_REQUESTED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deliveryStatus: "sending",
      }
      await queryClient.cancelQueries({ queryKey: collaborationMessagesQueryKey(roomId) })
      const threadKey = codeThreadKey(pending)
      if (threadKey) await queryClient.cancelQueries({ queryKey: threadKey })
      upsertMessage(queryClient, collaborationMessagesQueryKey(roomId), pending)
      if (threadKey) upsertMessage(queryClient, threadKey, pending)
      upsertReviewMessage(queryClient, pending)
      return pending
    },
    onSuccess: ({ message }) => {
      appendCollaborationMessage(queryClient, message)
    },
    onError: (_error, _input, pending) => {
      if (pending) markMessageFailed(queryClient, pending)
    },
  })
}

export function useUpdateCollaborationMessage(roomId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const response = await fetch(`/api/collaboration/rooms/${roomId}/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (!response.ok) throw new Error("메시지를 수정하지 못했습니다.")
      return (await response.json()) as CollaborationMessageResponse
    },
    onSuccess: ({ message }) => updateCollaborationMessageCache(queryClient, message),
  })
}

export function useDeleteCollaborationMessage(roomId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (messageId: string) => {
      const response = await fetch(`/api/collaboration/rooms/${roomId}/messages/${messageId}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("메시지를 삭제하지 못했습니다.")
      return messageId
    },
    onSuccess: (messageId) => deleteCollaborationMessageCache(queryClient, roomId, messageId),
  })
}

export function useCollaborationMessageEditor(roomId: string) {
  const updateMessage = useUpdateCollaborationMessage(roomId)
  const deleteMessage = useDeleteCollaborationMessage(roomId)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<{ messageId: string; text: string } | null>(null)

  const begin = (message: CollaborationMessage) => {
    setEditingMessageId(message.id)
    setDraft(message.content)
    setError(null)
  }
  const cancel = () => {
    setEditingMessageId(null)
    setError(null)
  }
  const save = async () => {
    if (!editingMessageId) return
    const content = draft.trim()
    if (!content || content.length > 4000) return
    try {
      await updateMessage.mutateAsync({ messageId: editingMessageId, content })
      setEditingMessageId(null)
      setError(null)
    } catch (reason) {
      setError({ messageId: editingMessageId, text: reason instanceof Error ? reason.message : "메시지를 수정하지 못했습니다." })
    }
  }
  const remove = async (messageId: string) => {
    if (!window.confirm("이 메시지를 삭제할까요?")) return
    setError(null)
    try {
      await deleteMessage.mutateAsync(messageId)
      if (editingMessageId === messageId) setEditingMessageId(null)
    } catch (reason) {
      setError({ messageId, text: reason instanceof Error ? reason.message : "메시지를 삭제하지 못했습니다." })
    }
  }

  return {
    editingMessageId,
    draft,
    setDraft,
    error,
    isSaving: updateMessage.isPending,
    deletingMessageId: deleteMessage.isPending ? deleteMessage.variables : null,
    begin,
    cancel,
    save,
    remove,
  }
}
