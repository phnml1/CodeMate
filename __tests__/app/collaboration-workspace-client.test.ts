import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import CollaborationWorkspaceClient from "@/components/collaboration/CollaborationWorkspaceClient"
import { useWorkspacePRFiles } from "@/hooks/usePRFiles"
import { useCollaborationRoomSocket } from "@/hooks/useCollaborationRoomSocket"
import { useCollaborationCodeThreads } from "@/hooks/useCollaborationCodeThreads"
import { useCollaborationMessages } from "@/hooks/useCollaborationMessages"
import type { CollaborationRoom } from "@/types/collaboration"

jest.mock("@/hooks/usePRFiles", () => ({ useWorkspacePRFiles: jest.fn() }))
jest.mock("@/hooks/useCollaborationRoomSocket", () => ({ useCollaborationRoomSocket: jest.fn() }))
jest.mock("@/hooks/useCollaborationCodeThreads", () => ({ useCollaborationCodeThreads: jest.fn() }))
jest.mock("@/hooks/useCollaborationMessages", () => ({ useCollaborationMessages: jest.fn() }))
jest.mock("@/components/collaboration/CollaborationMessages", () => () => null)
jest.mock("next/navigation", () => ({ useRouter: () => ({ replace: jest.fn() }) }))

const room = {
  id: "room-1",
  name: "리뷰 방",
  status: "ACTIVE",
  capacity: 8,
  pullRequestId: "pr-1",
  pullRequest: {
    id: "pr-1",
    number: 1,
    title: "리뷰",
    repoId: "repo-1",
    repo: { id: "repo-1", name: "repo", fullName: "owner/repo" },
  },
} as CollaborationRoom

describe("CollaborationWorkspaceClient", () => {
  it("renders its initial empty selection and loading state", () => {
    ;(useWorkspacePRFiles as jest.Mock).mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    })
    ;(useCollaborationRoomSocket as jest.Mock).mockReturnValue({
      activeRoomId: null,
      error: null,
      joinRoom: jest.fn(),
      leaveOnUnload: jest.fn(),
      leaveRoom: jest.fn(),
      locations: {},
      presence: null,
      publishLocation: jest.fn(),
      status: "idle",
      stopSharingLocation: jest.fn(),
      publishTyping: jest.fn(),
      typingUsers: {},
    })
    ;(useCollaborationCodeThreads as jest.Mock).mockReturnValue({ data: undefined })
    ;(useCollaborationMessages as jest.Mock).mockReturnValue({ data: undefined })

    const html = renderToStaticMarkup(React.createElement(CollaborationWorkspaceClient, {
      room,
      currentUserId: "user-1",
    }))

    expect(html).toContain("리뷰 방")
    expect(html).toContain("파일을 불러오는 중")
    expect(html).toContain('aria-label="대화 열기"')
    expect(html).toContain('id="collaboration-chat-panel"')
    expect(html).not.toContain('>대화</button>')
  })
})
