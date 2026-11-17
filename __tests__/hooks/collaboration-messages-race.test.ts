import { QueryClient, type InfiniteData } from "@tanstack/react-query"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import CollaborationMessageBody from "@/components/collaboration/CollaborationMessageBody"
import {
  appendCollaborationMessage,
  collaborationMessagesQueryKey,
  collaborationMessagesQueryOptions,
  deleteCollaborationMessageCache,
  updateCollaborationMessageCache,
} from "@/hooks/useCollaborationMessages"
import { collaborationCodeThreadQueryKey } from "@/hooks/useCollaborationCodeThreads"
import { collaborationReviewMessagesQueryKey } from "@/hooks/useCollaborationReviewThreads"
import type { CollaborationMessage, CollaborationMessagesResponse } from "@/types/collaboration"

const originalFetch = global.fetch
const roomId = "room-1"
const roomKey = collaborationMessagesQueryKey(roomId)
const older: CollaborationMessage = {
  id: "message-1",
  roomId,
  authorId: "user-1",
  author: { id: "user-1", name: "Reviewer", image: null },
  content: "original",
  clientMessageId: null,
  codeReference: null,
  reviewReference: null,
  createdAt: "2026-09-29T00:00:00.000Z",
  updatedAt: "2026-09-29T00:00:00.000Z",
}
const newest = { ...older, id: "message-2", content: "new", createdAt: "2026-09-29T00:01:00.000Z" }

function pages(messages: CollaborationMessage[], nextCursor: string | null = null): InfiniteData<CollaborationMessagesResponse, string | null> {
  return { pages: [{ messages, nextCursor }], pageParams: [null] }
}

function delayedGet() {
  let resolve!: (value: Response) => void
  const response = new Promise<Response>((done) => { resolve = done })
  const fetchMock = jest.fn().mockReturnValue(response)
  global.fetch = fetchMock as typeof fetch
  return {
    fetchMock,
    complete: (messages: CollaborationMessage[]) => resolve({
      ok: true,
      json: async () => ({ messages, nextCursor: null }),
    } as Response),
  }
}

afterEach(() => { global.fetch = originalFetch })

it("refetches full history when a socket message interrupts the first GET", async () => {
  const client = new QueryClient()
  let finishOld!: (value: Response) => void
  let finishFresh!: (value: Response) => void
  const oldResponse = new Promise<Response>((resolve) => { finishOld = resolve })
  const freshResponse = new Promise<Response>((resolve) => { finishFresh = resolve })
  const fetchMock = jest.fn().mockReturnValueOnce(oldResponse).mockReturnValueOnce(freshResponse)
  global.fetch = fetchMock as typeof fetch
  const firstGet = client.fetchInfiniteQuery(collaborationMessagesQueryOptions(roomId))

  appendCollaborationMessage(client, newest)
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(client.getQueryData(roomKey)).toEqual(pages([newest]))

  finishOld({ ok: true, json: async () => ({ messages: [older], nextCursor: null }) } as Response)
  finishFresh({ ok: true, json: async () => ({ messages: [older, newest], nextCursor: null }) } as Response)
  await firstGet
  await client.getQueryCache().find({ queryKey: roomKey })?.promise

  expect(client.getQueryData(roomKey)).toEqual(pages([older, newest]))
  client.clear()
})

it("keeps a socket message when an older room GET completes afterwards", async () => {
  const client = new QueryClient()
  client.setQueryData(roomKey, pages([older]))
  const get = delayedGet()
  const refetch = client.fetchInfiniteQuery(collaborationMessagesQueryOptions(roomId))
  expect(get.fetchMock).toHaveBeenCalledTimes(1)

  appendCollaborationMessage(client, newest)
  expect(client.getQueryData<InfiniteData<CollaborationMessagesResponse>>(roomKey)?.pages[0].messages).toEqual([older, newest])
  get.complete([older])
  await refetch

  expect(client.getQueryData<InfiniteData<CollaborationMessagesResponse>>(roomKey)?.pages[0].messages).toEqual([older, newest])
  client.clear()
})

it("keeps a socket edit when an older room GET completes afterwards", async () => {
  const client = new QueryClient()
  client.setQueryData(roomKey, pages([older]))
  const get = delayedGet()
  const refetch = client.fetchInfiniteQuery(collaborationMessagesQueryOptions(roomId))
  const edited = { ...older, content: "edited", updatedAt: "2026-09-29T00:02:00.000Z" }

  updateCollaborationMessageCache(client, edited)
  get.complete([older])
  await refetch

  expect(client.getQueryData<InfiniteData<CollaborationMessagesResponse>>(roomKey)?.pages[0].messages).toEqual([edited])
  client.clear()
})

it("keeps a socket delete when an older room GET completes afterwards", async () => {
  const client = new QueryClient()
  client.setQueryData(roomKey, pages([older]))
  const get = delayedGet()
  const refetch = client.fetchInfiniteQuery(collaborationMessagesQueryOptions(roomId))

  deleteCollaborationMessageCache(client, roomId, older.id)
  get.complete([older])
  await refetch

  expect(client.getQueryData<InfiniteData<CollaborationMessagesResponse>>(roomKey)?.pages[0].messages).toEqual([])
  client.clear()
})

it("keeps room, code, and review caches isolated while a room GET is delayed", async () => {
  const client = new QueryClient()
  const otherRoomKey = collaborationMessagesQueryKey("room-2")
  const other = { ...older, roomId: "room-2" }
  const reference = { filePath: "src/app.ts", baseSha: "a".repeat(40), headSha: "b".repeat(40), side: "RIGHT" as const, startLine: 42, endLine: 42 }
  const anchored = { ...older, codeReference: reference, reviewReference: { reviewId: "review-1", issueIndex: 0 } }
  const codeKey = collaborationCodeThreadQueryKey(roomId, reference)
  const reviewKey = collaborationReviewMessagesQueryKey(roomId, "review-1")
  client.setQueryData(roomKey, pages([anchored]))
  client.setQueryData(codeKey, pages([anchored]))
  client.setQueryData(reviewKey, { messages: [anchored] })
  client.setQueryData(otherRoomKey, pages([other]))
  const get = delayedGet()
  const refetch = client.fetchInfiniteQuery(collaborationMessagesQueryOptions(roomId))
  const edited = { ...anchored, content: "edited", updatedAt: "2026-09-29T00:02:00.000Z" }

  updateCollaborationMessageCache(client, edited)
  get.complete([anchored])
  await refetch

  expect(client.getQueryData<InfiniteData<CollaborationMessagesResponse>>(roomKey)?.pages[0].messages).toEqual([edited])
  expect(client.getQueryData<InfiniteData<CollaborationMessagesResponse>>(codeKey)?.pages[0].messages).toEqual([edited])
  expect(client.getQueryData(reviewKey)).toEqual({ messages: [edited] })
  expect(client.getQueryData(otherRoomKey)).toEqual(pages([other]))
  client.clear()
})

it("ignores delayed code-thread and review-thread GETs after a socket edit", async () => {
  const client = new QueryClient()
  const reference = { filePath: "src/app.ts", baseSha: "a".repeat(40), headSha: "b".repeat(40), side: "RIGHT" as const, startLine: 42, endLine: 42 }
  const anchored = { ...older, codeReference: reference, reviewReference: { reviewId: "review-1", issueIndex: 0 } }
  const codeKey = collaborationCodeThreadQueryKey(roomId, reference)
  const reviewKey = collaborationReviewMessagesQueryKey(roomId, "review-1")
  client.setQueryData(codeKey, pages([anchored]))
  client.setQueryData(reviewKey, { messages: [anchored] })
  let finishCode!: (data: InfiniteData<CollaborationMessagesResponse, string | null>) => void
  let finishReview!: (data: { messages: CollaborationMessage[] }) => void
  const codeGet = client.fetchQuery({ queryKey: codeKey, queryFn: () => new Promise<InfiniteData<CollaborationMessagesResponse, string | null>>((resolve) => { finishCode = resolve }) })
  const reviewGet = client.fetchQuery({ queryKey: reviewKey, queryFn: () => new Promise<{ messages: CollaborationMessage[] }>((resolve) => { finishReview = resolve }) })
  const edited = { ...anchored, content: "edited", updatedAt: "2026-09-29T00:02:00.000Z" }

  updateCollaborationMessageCache(client, edited)
  finishCode(pages([anchored]))
  finishReview({ messages: [anchored] })
  await Promise.all([codeGet, reviewGet])

  expect(client.getQueryData(codeKey)).toEqual(pages([edited]))
  expect(client.getQueryData(reviewKey)).toEqual({ messages: [edited] })
  client.clear()
})

it("preserves older pages and cursors when cancelling a stale newest-page GET", async () => {
  const client = new QueryClient()
  const previous = { ...older, id: "previous", createdAt: "2026-09-28T00:00:00.000Z" }
  const initial: InfiniteData<CollaborationMessagesResponse, string | null> = {
    pages: [{ messages: [older], nextCursor: older.id }, { messages: [previous], nextCursor: null }],
    pageParams: [null, older.id],
  }
  client.setQueryData(roomKey, initial)
  const get = delayedGet()
  const refetch = client.fetchInfiniteQuery(collaborationMessagesQueryOptions(roomId))

  appendCollaborationMessage(client, newest)
  get.complete([older])
  await refetch

  expect(client.getQueryData(roomKey)).toEqual({
    pages: [{ messages: [older, newest], nextCursor: older.id }, initial.pages[1]],
    pageParams: initial.pageParams,
  })
  client.clear()
})

it("accepts a fresh GET after reconnect invalidates the room query", async () => {
  const client = new QueryClient()
  client.setQueryData(roomKey, pages([older]))
  await client.invalidateQueries({ queryKey: roomKey })
  const get = delayedGet()
  const refetch = client.fetchInfiniteQuery(collaborationMessagesQueryOptions(roomId))

  get.complete([older, newest])
  await refetch

  expect(client.getQueryData(roomKey)).toEqual(pages([older, newest]))
  client.clear()
})

it.each(["socket first", "POST first"])("deduplicates an optimistic message with %s and a repeated delivery", (order) => {
  const client = new QueryClient()
  const pending = { ...older, id: "pending:client-1", clientMessageId: "client-1", deliveryStatus: "sending" as const }
  const committed = { ...older, id: "message-3", clientMessageId: "client-1" }
  client.setQueryData(roomKey, pages([pending]))
  const socketDelivery = () => appendCollaborationMessage(client, committed)
  const postSuccess = () => appendCollaborationMessage(client, committed)

  if (order === "socket first") {
    socketDelivery()
    postSuccess()
  } else {
    postSuccess()
    socketDelivery()
  }
  socketDelivery()

  expect(client.getQueryData<InfiniteData<CollaborationMessagesResponse>>(roomKey)?.pages[0].messages).toEqual([committed])
  client.clear()
})

it("keeps a published GitHub review when its earlier creation socket event arrives late", () => {
  const client = new QueryClient()
  const reviewKey = collaborationReviewMessagesQueryKey(roomId, "review-1")
  const created = { ...older, id: "message-3", clientMessageId: "client-1", reviewReference: { reviewId: "review-1", issueIndex: 0 }, githubStatus: "NOT_REQUESTED" as const }
  const published = { ...created, githubStatus: "PUBLISHED" as const, githubReviewUrl: "https://github.com/review/1" }
  client.setQueryData(roomKey, pages([{ ...created, id: "pending:client-1", deliveryStatus: "sending" }]))
  client.setQueryData(reviewKey, { messages: [{ ...created, id: "pending:client-1", deliveryStatus: "sending" }] })

  appendCollaborationMessage(client, published)
  appendCollaborationMessage(client, created)

  expect(client.getQueryData(roomKey)).toEqual(pages([published]))
  expect(client.getQueryData(reviewKey)).toEqual({ messages: [published] })
  client.clear()
})

it("does not restore older content when a delayed creation event follows an edit", () => {
  const client = new QueryClient()
  const edited = { ...older, content: "edited", updatedAt: "2026-09-29T00:02:00.000Z" }
  client.setQueryData(roomKey, pages([edited]))

  appendCollaborationMessage(client, older)

  expect(client.getQueryData(roomKey)).toEqual(pages([edited]))
  client.clear()
})

it("still renders a failed optimistic message with its retry action", () => {
  const failed = { ...older, id: "pending:client-1", clientMessageId: "client-1", deliveryStatus: "failed" as const }
  const editor = { editingMessageId: null } as never
  const html = renderToStaticMarkup(React.createElement(CollaborationMessageBody, {
    message: failed,
    currentUserId: failed.authorId,
    canManage: true,
    variant: "bubble",
    editor,
    showDeliveryStatus: true,
    onRetry: jest.fn(),
  }))

  expect(html).toContain('aria-label="전송 실패"')
  expect(html).toContain("전송 실패 · 재시도")
})
