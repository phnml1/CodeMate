import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import PRDetailLayout from "@/components/pulls/detail/PRDetailLayout"
import type { PullRequest } from "@/types/pulls"

jest.mock("@/hooks/pr-detail/usePRDetailDeepLink", () => ({ usePRDetailDeepLink: jest.fn() }))
jest.mock("@/hooks/pr-detail/usePRDetailReset", () => ({ usePRDetailReset: jest.fn() }))
jest.mock("@/stores/prDetailStore", () => ({
  usePRDetailStore: (selector: (state: { sidebarCollapsed: boolean; setSidebarCollapsed: () => void }) => unknown) =>
    selector({ sidebarCollapsed: false, setSidebarCollapsed: jest.fn() }),
}))
jest.mock("@/components/collaboration/CollaborationRoomPanel", () => () => "collaboration-room-panel")
jest.mock("@/components/pulls/detail/PRFileList", () => () => null)
jest.mock("@/components/pulls/detail/PRDetailStickyHeader", () => () => null)
jest.mock("@/components/pulls/detail/ReviewSection", () => () => null)
jest.mock("@/components/pulls/detail/PRDiffSection", () => () => null)
jest.mock("@/components/pulls/detail/FloatingCommentsButton", () => () => null)
jest.mock("@/components/pulls/detail/IssueModalHost", () => () => null)

describe("PR detail collaboration visibility", () => {
  const originalMode = process.env.NEXT_PUBLIC_REALTIME_MODE

  afterAll(() => {
    if (originalMode === undefined) delete process.env.NEXT_PUBLIC_REALTIME_MODE
    else process.env.NEXT_PUBLIC_REALTIME_MODE = originalMode
  })

  const render = () => renderToStaticMarkup(React.createElement(PRDetailLayout, {
    id: "pr-1",
    currentUserId: "user-1",
    commentSlot: React.createElement("div", null, "general-comments"),
    initialPullRequest: { id: "pr-1" } as PullRequest,
  }))

  it("does not mount the collaboration room in polling mode", () => {
    process.env.NEXT_PUBLIC_REALTIME_MODE = "polling"
    const html = render()
    expect(html).not.toContain("collaboration-room-panel")
    expect(html).toContain("general-comments")
  })

  it("shows the collaboration room in socket mode", () => {
    process.env.NEXT_PUBLIC_REALTIME_MODE = "socket"
    expect(render()).toContain("collaboration-room-panel")
  })
})
