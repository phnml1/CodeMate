import { QueryClient, type InfiniteData } from "@tanstack/react-query"
import {
  appendCollaborationMessage,
  collaborationMessagesQueryKey,
} from "@/hooks/useCollaborationMessages"
import { collaborationCodeThreadsQueryKey } from "@/hooks/useCollaborationCodeThreads"
import type {
  CollaborationMessage,
  CollaborationMessagesResponse,
} from "@/types/collaboration"

const message: CollaborationMessage = {
  id: "message-1",
  roomId: "room-1",
  authorId: "user-1",
  author: { id: "user-1", name: "Reviewer", image: null },
  content: "hello",
  clientMessageId: null,
  codeReference: null,
  createdAt: "2026-09-29T00:00:00.000Z",
  updatedAt: "2026-09-29T00:00:00.000Z",
}

it("appends a live message once to its room's newest page", () => {
  const queryClient = new QueryClient()
  const roomKey = collaborationMessagesQueryKey(message.roomId)
  const otherRoomKey = collaborationMessagesQueryKey("room-2")
  const emptyData: InfiniteData<CollaborationMessagesResponse, string | null> = {
    pages: [{ messages: [], nextCursor: null }],
    pageParams: [null],
  }
  queryClient.setQueryData(roomKey, emptyData)
  queryClient.setQueryData(otherRoomKey, emptyData)

  appendCollaborationMessage(queryClient, message)
  appendCollaborationMessage(queryClient, message)

  expect(queryClient.getQueryData<InfiniteData<CollaborationMessagesResponse>>(roomKey)?.pages[0].messages).toEqual([message])
  expect(queryClient.getQueryData(otherRoomKey)).toEqual(emptyData)
})

it("refreshes code-thread markers when an anchored message arrives", () => {
  const queryClient = new QueryClient()
  const invalidate = jest.spyOn(queryClient, "invalidateQueries")

  appendCollaborationMessage(queryClient, {
    ...message,
    codeReference: {
      filePath: "src/app.ts",
      side: "RIGHT",
      startLine: 42,
      endLine: 42,
      baseSha: "a".repeat(40),
      headSha: "b".repeat(40),
    },
  })

  expect(invalidate).toHaveBeenCalledWith({
    queryKey: collaborationCodeThreadsQueryKey("room-1"),
  })
})

it("replaces an optimistic message with its committed copy by clientMessageId", () => {
  const queryClient = new QueryClient()
  const roomKey = collaborationMessagesQueryKey("room-1")
  const codeReference = {
    filePath: "src/app.ts",
    side: "RIGHT" as const,
    startLine: 42,
    endLine: 42,
    baseSha: "a".repeat(40),
    headSha: "b".repeat(40),
  }
  const threadKey = [...collaborationCodeThreadsQueryKey("room-1"), codeReference.filePath, codeReference.baseSha, codeReference.headSha, codeReference.side, codeReference.startLine]
  const pending = { ...message, id: "pending:client-1", clientMessageId: "client-1", codeReference, deliveryStatus: "sending" as const }
  const initial = { pages: [{ messages: [pending], nextCursor: null }], pageParams: [null] }
  queryClient.setQueryData(roomKey, initial)
  queryClient.setQueryData(threadKey, initial)

  const committed = { ...message, id: "message-2", clientMessageId: "client-1", codeReference }
  appendCollaborationMessage(queryClient, committed)
  appendCollaborationMessage(queryClient, committed)

  expect(queryClient.getQueryData<InfiniteData<CollaborationMessagesResponse>>(roomKey)?.pages[0].messages).toEqual([committed])
  expect(queryClient.getQueryData<InfiniteData<CollaborationMessagesResponse>>(threadKey)?.pages[0].messages).toEqual([committed])
})
