import { QueryClient } from "@tanstack/react-query"
import { collaborationMessagesQueryOptions } from "@/hooks/useCollaborationMessages"

describe("collaboration message prefetch", () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("shares the initial-page query key and cached response with the workspace", async () => {
    const response = { messages: [], nextCursor: null }
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => response })
    globalThis.fetch = fetchMock as typeof fetch
    const client = new QueryClient()

    await Promise.all([
      client.prefetchInfiniteQuery(collaborationMessagesQueryOptions("room-1")),
      client.prefetchInfiniteQuery(collaborationMessagesQueryOptions("room-1")),
    ])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith("/api/collaboration/rooms/room-1/messages?limit=50")
    expect(client.getQueryData(collaborationMessagesQueryOptions("room-1").queryKey)).toEqual({
      pages: [response],
      pageParams: [null],
    })
  })
})
