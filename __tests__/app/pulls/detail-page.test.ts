import PRDetailPage from "@/app/(protected)/pulls/[id]/page"
import { getPullRequestDetailForUser } from "@/lib/pr-detail/pullRequestDetail"
import { requireCurrentUser } from "@/lib/dal/session"
import { prDetailQueryKey } from "@/lib/query-keys"
import { notFound } from "next/navigation"

jest.mock("next/navigation", () => ({ notFound: jest.fn() }))

jest.mock("@/lib/dal/session", () => ({ requireCurrentUser: jest.fn() }))
jest.mock("@/lib/pr-detail/pullRequestDetail", () => ({
  getPullRequestDetailForUser: jest.fn(),
}))
jest.mock("@/components/pulls/detail/PRDetailContainer", () => jest.fn())
jest.mock("@/components/comment/CommentSection", () => jest.fn())

describe("PRDetailPage hydration", () => {
  afterEach(() => jest.clearAllMocks())

  it("seeds the client query with the authorized server result", async () => {
    const pr = { id: "pr-1", title: "Fix bug" }
    ;(requireCurrentUser as jest.Mock).mockResolvedValue({ id: "user-1" })
    ;(getPullRequestDetailForUser as jest.Mock).mockResolvedValue(pr)

    const page = await PRDetailPage({ params: Promise.resolve({ id: "pr-1" }) })
    const state = page.props.state

    expect(getPullRequestDetailForUser).toHaveBeenCalledWith("pr-1", "user-1")
    expect(state.queries).toEqual([
      expect.objectContaining({
        queryKey: prDetailQueryKey("pr-1"),
        state: expect.objectContaining({ data: pr }),
      }),
    ])
    expect(page.props.children.props).not.toHaveProperty("initialPullRequest")
  })

  it("does not render a client cache for missing or inaccessible PRs", async () => {
    ;(requireCurrentUser as jest.Mock).mockResolvedValue({ id: "user-1" })
    ;(getPullRequestDetailForUser as jest.Mock).mockResolvedValue(null)
    ;(notFound as unknown as jest.Mock).mockImplementation(() => {
      throw new Error("NEXT_HTTP_ERROR_FALLBACK;404")
    })

    await expect(
      PRDetailPage({ params: Promise.resolve({ id: "missing" }) })
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404")

    expect(notFound).toHaveBeenCalled()
  })
})
