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
  CollaborationMessageResponse,
  CollaborationMessagesResponse,
} from "@/types/collaboration"
import { collaborationCodeThreadQueryKey, collaborationCodeThreadsQueryKey } from "@/hooks/useCollaborationCodeThreads"

const MESSAGE_POLL_INTERVAL_MS = 4_000
const CONNECTED_MESSAGE_POLL_INTERVAL_MS = 20_000

export const collaborationMessagesQueryKey = (roomId: string) =>
  ["collaborationMessages", roomId] as const

export interface CreateCollaborationMessageInput {
  content: string
  codeReference?: CollaborationCodeReference
  clientMessageId: string
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
    mutationFn: async ({ content, codeReference, clientMessageId }: CreateCollaborationMessageInput) => {
      const response = await fetch(
        `/api/collaboration/rooms/${roomId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, codeReference, clientMessageId }),
        }
      )
      if (!response.ok) {
        throw new Error("메시지를 보내지 못했습니다. 다시 시도해 주세요.")
      }

      return (await response.json()) as CollaborationMessageResponse
    },
    onMutate: async ({ content, codeReference, clientMessageId }) => {
      const pending: CollaborationMessage = {
        id: `pending:${clientMessageId}`,
        roomId,
        authorId: currentUserId,
        author: { id: currentUserId, name: "나", image: null },
        content,
        clientMessageId,
        codeReference: codeReference ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deliveryStatus: "sending",
      }
      await queryClient.cancelQueries({ queryKey: collaborationMessagesQueryKey(roomId) })
      const threadKey = codeThreadKey(pending)
      if (threadKey) await queryClient.cancelQueries({ queryKey: threadKey })
      upsertMessage(queryClient, collaborationMessagesQueryKey(roomId), pending)
      if (threadKey) upsertMessage(queryClient, threadKey, pending)
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
