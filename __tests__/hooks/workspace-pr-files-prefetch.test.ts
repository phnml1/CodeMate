import { QueryClient } from "@tanstack/react-query"
import {
  workspacePRFilesQueryKey,
  workspacePRFilesQueryOptions,
} from "@/hooks/usePRFiles"

jest.mock("@/lib/client-auth", () => ({ handleUnauthorizedAutoLogout: jest.fn() }))

describe("workspace PR files prefetch", () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("uses the workspace query key and reuses an in-flight revision request", async () => {
    const payload = {
      files: [],
      revision: { baseSha: "base-sha", headSha: "head-sha" },
    }
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    })
    globalThis.fetch = fetchMock
    const queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: 60_000 } },
    })

    await Promise.all([
      queryClient.prefetchQuery(workspacePRFilesQueryOptions("pr-1")),
      queryClient.prefetchQuery(workspacePRFilesQueryOptions("pr-1")),
    ])
    await queryClient.prefetchQuery(workspacePRFilesQueryOptions("pr-1"))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith("/api/pulls/pr-1/files?revision=1")
    expect(queryClient.getQueryData(workspacePRFilesQueryKey("pr-1"))).toEqual(payload)
    queryClient.clear()
  })
})
