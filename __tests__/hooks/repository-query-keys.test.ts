import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { useConnectRepository } from "@/hooks/useConnectRepository"
import { useDisconnectRepository } from "@/hooks/useDisconnectRepository"
import { usePullRequests } from "@/hooks/usePullRequests"
import { useSyncRepository } from "@/hooks/useSyncRepository"

jest.mock("@tanstack/react-query", () => ({
  useInfiniteQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}))

const mockedUseInfiniteQuery = useInfiniteQuery as jest.Mock
const mockedUseMutation = useMutation as jest.Mock
const mockedUseQueryClient = useQueryClient as jest.Mock
const invalidateQueries = jest.fn()

describe("repository and pull request query keys", () => {
  beforeEach(() => {
    mockedUseQueryClient.mockReturnValue({ invalidateQueries })
  })

  afterEach(() => jest.clearAllMocks())

  it("includes repoId in the PR query key and API request", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ pullRequests: [], pagination: { page: 1, totalPages: 1 } }),
    } as Response)

    try {
      usePullRequests({ status: "OPEN", search: "fix", repoId: "repo-1" })
      const options = mockedUseInfiniteQuery.mock.calls[0][0]

      expect(options.queryKey).toEqual([
        "pullRequests",
        "OPEN",
        "fix",
        "repo-1",
      ])
      await options.queryFn({ pageParam: 1 })

      const url = new URL(fetchSpy.mock.calls[0][0] as string, "http://localhost")
      expect(url.searchParams.get("status")).toBe("OPEN")
      expect(url.searchParams.get("search")).toBe("fix")
      expect(url.searchParams.get("repoId")).toBe("repo-1")
      expect(url.searchParams.get("page")).toBe("1")
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it("invalidates the GitHub list, connected list, and PR list after connecting", () => {
    useConnectRepository()
    mockedUseMutation.mock.calls[0][0].onSuccess()

    expect(invalidateQueries.mock.calls.map(([options]) => options.queryKey)).toEqual([
      ["repositories"],
      ["connectedRepositories"],
      ["pullRequests"],
    ])
  })

  it("invalidates the connected list and PR list after disconnecting", () => {
    useDisconnectRepository()
    mockedUseMutation.mock.calls[0][0].onSuccess()

    expect(invalidateQueries.mock.calls.map(([options]) => options.queryKey)).toEqual([
      ["repositories"],
      ["connectedRepositories"],
      ["pullRequests"],
    ])
  })

  it("invalidates both PR lists and detail queries after syncing", () => {
    useSyncRepository()
    mockedUseMutation.mock.calls[0][0].onSuccess()

    expect(invalidateQueries.mock.calls.map(([options]) => options.queryKey)).toEqual([
      ["pullRequests"],
      ["pullRequest"],
    ])
  })
})
