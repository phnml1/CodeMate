import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import PRDetailStickyHeader from "@/components/pulls/detail/PRDetailStickyHeader"
import { useCachedPRDetail } from "@/hooks/pr-detail/usePRDetailCachedQueries"
import type { PullRequest } from "@/types/pulls"

jest.mock("next/navigation", () => ({ useRouter: () => ({ back: jest.fn() }) }))
jest.mock("@/hooks/pr-detail/usePRDetailCachedQueries", () => ({ useCachedPRDetail: jest.fn() }))
jest.mock("@/components/pulls/detail/MobileFileDropdown", () => () => null)

const pullRequest = {
  id: "pr-1",
  number: 7,
  title: "E2E PR detail",
  status: "OPEN",
  repo: { name: "CodeMate" },
  baseBranch: "main",
  headBranch: "feature",
  additions: 3,
  deletions: 1,
  changedFiles: 2,
  createdAt: "2026-10-01T00:00:00.000Z",
} as PullRequest

describe("PR detail heading", () => {
  beforeEach(() => {
    ;(useCachedPRDetail as jest.Mock).mockReturnValue({ data: null })
  })

  afterEach(() => jest.clearAllMocks())

  it.each([false, true])("hides the inactive header when scrolled is %s", (scrolled) => {
    const html = renderToStaticMarkup(React.createElement(PRDetailStickyHeader, {
      prId: pullRequest.id,
      scrolled,
      initialPullRequest: pullRequest,
    }))

    expect(html.match(/<h1\b/g)).toHaveLength(2)
    expect(html.match(/inert=""/g)).toHaveLength(1)
    expect(html.match(/<div inert="" aria-hidden="true"/g)).toHaveLength(1)
    expect(html.includes('inert="" aria-hidden="true" class="transition-all')).toBe(!scrolled)
    expect(html).toContain(pullRequest.title)
  })
})
