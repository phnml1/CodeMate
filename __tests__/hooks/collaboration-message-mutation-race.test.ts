import { QueryClient, useQueryClient, type InfiniteData } from "@tanstack/react-query"
import {
  collaborationMessagesQueryKey,
  collaborationMessagesQueryOptions,
  useCreateCollaborationMessage,
  type CreateCollaborationMessageInput,
} from "@/hooks/useCollaborationMessages"
import type { CollaborationMessage, CollaborationMessagesResponse } from "@/types/collaboration"

jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useMutation: jest.fn((options) => options),
  useQueryClient: jest.fn(),
}))

const originalFetch = global.fetch
const input: CreateCollaborationMessageInput = { content: "new", clientMessageId: "client-1" }
const committed: CollaborationMessage = {
  id: "message-2",
  roomId: "room-1",
  authorId: "user-1",
  author: { id: "user-1", name: "Reviewer", image: null },
  content: "new",
  clientMessageId: "client-1",
  codeReference: null,
  createdAt: "2026-09-29T00:01:00.000Z",
  updatedAt: "2026-09-29T00:01:00.000Z",
}
const older = { ...committed, id: "message-1", content: "old", clientMessageId: null }

function mutationFor(client: QueryClient) {
  ;(useQueryClient as jest.Mock).mockReturnValue(client)
  // useMutation and useQueryClient are mocked so this call only returns mutation options.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useCreateCollaborationMessage("room-1", "user-1") as unknown as {
    onMutate: (input: CreateCollaborationMessageInput) => Promise<unknown>
    onSuccess: (response: { message: CollaborationMessage }, input: CreateCollaborationMessageInput, context: unknown) => void
    onError: (error: Error, input: CreateCollaborationMessageInput, context: unknown) => void
  }
}

afterEach(() => {
  global.fetch = originalFetch
  jest.clearAllMocks()
})

it("fetches full history after an optimistic send seeds a cold cache", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } })
  const mutation = mutationFor(client)
  const context = await mutation.onMutate(input)
  mutation.onSuccess({ message: committed }, input, context)
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ messages: [older, committed], nextCursor: null }),
  })
  global.fetch = fetchMock as typeof fetch

  await client.fetchInfiniteQuery(collaborationMessagesQueryOptions("room-1"))

  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(client.getQueryData<InfiniteData<CollaborationMessagesResponse>>(collaborationMessagesQueryKey("room-1"))?.pages[0].messages).toEqual([older, committed])
  client.clear()
})

it("keeps a failed optimistic message visible and its cold cache stale", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } })
  const mutation = mutationFor(client)
  const context = await mutation.onMutate(input)

  mutation.onError(new Error("network"), input, context)

  expect(client.getQueryData<InfiniteData<CollaborationMessagesResponse>>(collaborationMessagesQueryKey("room-1"))?.pages[0].messages[0].deliveryStatus).toBe("failed")
  expect(client.getQueryState(collaborationMessagesQueryKey("room-1"))?.isInvalidated).toBe(true)
  client.clear()
})
