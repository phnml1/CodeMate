import React, { useEffect } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import CollaborationWorkspaceClient, { findVisibleLocationButton, readCodeCellPosition } from "@/components/collaboration/CollaborationWorkspaceClient"
import { useWorkspacePRFiles } from "@/hooks/usePRFiles"
import { useCollaborationRoomSocket } from "@/hooks/useCollaborationRoomSocket"
import { useCollaborationCodeThreads } from "@/hooks/useCollaborationCodeThreads"
import { useCollaborationMessages } from "@/hooks/useCollaborationMessages"
import type { CollaborationRoom } from "@/types/collaboration"
import type { CollaborationCodeReference } from "@/types/collaboration"

jest.mock("@/hooks/usePRFiles", () => ({ useWorkspacePRFiles: jest.fn() }))
jest.mock("@/hooks/useCollaborationRoomSocket", () => ({ useCollaborationRoomSocket: jest.fn() }))
jest.mock("@/hooks/useCollaborationCodeThreads", () => ({ useCollaborationCodeThreads: jest.fn() }))
jest.mock("@/hooks/useCollaborationMessages", () => ({ useCollaborationMessages: jest.fn() }))
jest.mock("@/components/collaboration/CollaborationMessages", () => () => null)
jest.mock("react", () => ({ ...jest.requireActual("react"), useEffect: jest.fn() }))
jest.mock("next/navigation", () => ({ useRouter: () => ({ replace: mockReplace }) }))
jest.mock("@/components/ui/button", () => ({
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
    if (props["aria-label"] === "PR 상세로 돌아가기") mockReturnClick = props.onClick
    return React.createElement("button", props)
  },
}))

const mockReplace = jest.fn()
let mockReturnClick: React.MouseEventHandler<HTMLButtonElement> | undefined

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
  beforeEach(() => {
    jest.clearAllMocks()
    mockReturnClick = undefined
    ;(useWorkspacePRFiles as jest.Mock).mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    })
    ;(useCollaborationRoomSocket as jest.Mock).mockReturnValue({
      activeRoomId: null,
      error: null,
      joinRoom: jest.fn().mockResolvedValue(undefined),
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
  })

  function render() {
    return renderToStaticMarkup(React.createElement(CollaborationWorkspaceClient, { room, currentUserId: "user-1" }))
  }

  it("renders its initial empty selection and loading state", () => {
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

  describe("exit navigation", () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window")
    const listeners = new Map<string, (event?: unknown) => void>()
    let cleanups: (() => void)[]
    let browser: {
      confirm: jest.Mock
      history: { state: Record<string, unknown>; pushState: jest.Mock; back: jest.Mock }
    }

    beforeEach(() => {
      jest.useFakeTimers()
      listeners.clear()
      cleanups = []
      browser = {
        confirm: jest.fn().mockReturnValue(true),
        history: {
          state: {},
          pushState: jest.fn((state: Record<string, unknown>) => { browser.history.state = state }),
          back: jest.fn(),
        },
      }
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: {
          ...browser, location: { href: "https://example.test/collaboration/rooms/room-1" },
          setTimeout, clearTimeout,
          addEventListener: (name: string, listener: (event?: unknown) => void) => listeners.set(name, listener),
          removeEventListener: (name: string) => listeners.delete(name),
        },
      })
    })

    afterEach(() => {
      cleanups.forEach((cleanup) => cleanup())
      jest.useRealTimers()
      if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow)
      else Reflect.deleteProperty(globalThis, "window")
    })

    function mount() {
      render()
      for (const [effect] of (useEffect as jest.Mock).mock.calls) {
        const cleanup = effect()
        if (typeof cleanup === "function") cleanups.push(cleanup)
      }
      return (useCollaborationRoomSocket as jest.Mock).mock.results[0].value
    }

    function clickReturn() {
      mockReturnClick!({} as React.MouseEvent<HTMLButtonElement>)
    }

    it("navigates in the same turn without awaiting a pending leave and ignores repeat clicks", () => {
      const socket = mount()
      socket.leaveRoom.mockReturnValue(new Promise(() => {}))
      clickReturn()
      expect(socket.leaveRoom).toHaveBeenCalledTimes(1)
      expect(mockReplace).toHaveBeenCalledWith("/pulls/pr-1")
      clickReturn()
      expect(browser.confirm).toHaveBeenCalledTimes(1)
      expect(socket.leaveRoom).toHaveBeenCalledTimes(1)
    })

    it("cancelling keeps the connection and restores the back guard", () => {
      const socket = mount()
      browser.confirm.mockReturnValue(false)
      clickReturn()
      browser.history.state = {}
      listeners.get("popstate")!()
      expect(socket.leaveRoom).not.toHaveBeenCalled()
      expect(socket.leaveOnUnload).not.toHaveBeenCalled()
      expect(mockReplace).not.toHaveBeenCalled()
      expect(browser.history.back).not.toHaveBeenCalled()
      expect(browser.history.state.collaborationRoomGuard).toBe("collaboration:room-1")
    })

    it("back navigation proceeds immediately after confirmation", () => {
      const socket = mount()
      socket.leaveRoom.mockReturnValue(new Promise(() => {}))
      listeners.get("popstate")!()
      expect(socket.leaveRoom).toHaveBeenCalledTimes(1)
      expect(browser.history.back).toHaveBeenCalledTimes(1)
    })

    it("only sends unload leave on pagehide, not when a close prompt is cancelled", () => {
      const socket = mount()
      const event = { preventDefault: jest.fn(), returnValue: false }
      listeners.get("beforeunload")!(event)
      expect(event.preventDefault).toHaveBeenCalled()
      expect(event.returnValue).toBe(true)
      expect(socket.leaveRoom).not.toHaveBeenCalled()
      expect(socket.leaveOnUnload).not.toHaveBeenCalled()
      listeners.get("pagehide")!()
      expect(socket.leaveOnUnload).toHaveBeenCalledTimes(1)
    })
  })
})

describe("visible collaboration location", () => {
  const button = (side: "LEFT" | "RIGHT", line: number, top: number, bottom: number) => ({
    dataset: { diffSide: side, diffLine: String(line) },
    getBoundingClientRect: () => ({ top, bottom }),
  }) as unknown as HTMLButtonElement
  const pane = (buttons: HTMLButtonElement[]) => ({
    getBoundingClientRect: () => ({ top: 0, bottom: 100 }),
    querySelectorAll: (selector: string) => {
      const side = selector.match(/data-diff-side="(LEFT|RIGHT)"/)?.[1]
      const line = selector.match(/data-diff-line="(\d+)"/)?.[1]
      return buttons.filter((item) => item.dataset.diffSide === side && (!line || item.dataset.diffLine === line))
    },
  }) as unknown as HTMLDivElement
  const selection = (startLine: number, endLine = startLine): CollaborationCodeReference => ({
    filePath: "src/example.ts", baseSha: "base", headSha: "head", side: "RIGHT", startLine, endLine,
  })

  it("keeps the dot on the clicked visible line instead of the first row", () => {
    const first = button("RIGHT", 1, 5, 20)
    const clicked = button("RIGHT", 7, 60, 75)
    expect(findVisibleLocationButton(pane([first, clicked]), selection(7), null)).toBe(clicked)
  })

  it("uses the clicked end of a range and falls back to the viewport after scrolling away", () => {
    const first = button("RIGHT", 1, 5, 20)
    const end = button("RIGHT", 9, 60, 75)
    const anchor = { filePath: "src/example.ts", side: "RIGHT" as const, line: 7 }
    expect(findVisibleLocationButton(pane([first, end]), selection(7, 9), anchor)).toBe(end)
    const offscreen = button("RIGHT", 9, 120, 135)
    expect(findVisibleLocationButton(pane([first, offscreen]), selection(7, 9), anchor)).toBe(first)
  })

  it("uses the visible mobile line number when its desktop copy is hidden", () => {
    const hidden = button("LEFT", 7, 0, 0)
    const mobile = button("LEFT", 7, 60, 75)
    const first = button("RIGHT", 1, 5, 20)
    expect(findVisibleLocationButton(pane([hidden, mobile, first]), { ...selection(7), side: "LEFT" }, null)).toBe(mobile)
  })

  it("reads the clicked code cell without treating a click outside code as a line", () => {
    const cell = { dataset: { codeSide: "RIGHT", codeLine: "7" } } as unknown as HTMLElement
    const target = { closest: () => cell } as unknown as EventTarget
    const codePane = { contains: (node: Node) => node === cell } as unknown as HTMLDivElement
    expect(readCodeCellPosition(codePane, target)).toEqual({ side: "RIGHT", line: 7 })
    expect(readCodeCellPosition(codePane, null)).toBeNull()
    expect(readCodeCellPosition({ contains: () => false } as unknown as HTMLDivElement, target)).toBeNull()
  })
})
