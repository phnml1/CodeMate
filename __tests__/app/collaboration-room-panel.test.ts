import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import CollaborationRoomPanel from "@/components/collaboration/CollaborationRoomPanel"
import type { CollaborationRoom } from "@/types/collaboration"

const mockPush = jest.fn()
const mockPrefetchRoute = jest.fn()
const mockCreate = jest.fn()
const mockPrefetchQuery = jest.fn()
const mockPrefetchInfiniteQuery = jest.fn()
const mockButtons = new Map<string, React.ButtonHTMLAttributes<HTMLButtonElement>>()
let mockState: unknown[] = []
let mockStateIndex = 0
let mockEnteringRef = { current: false }
let mockRooms: CollaborationRoom[] = []

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useRef: () => mockEnteringRef,
  useState: (initial: unknown) => {
    const index = mockStateIndex++
    if (!(index in mockState)) mockState[index] = initial
    return [mockState[index], (value: unknown) => { mockState[index] = value }]
  },
}))
jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  createPortal: (children: React.ReactNode) => children,
}))
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush, prefetch: mockPrefetchRoute }) }))
jest.mock("@/lib/client-auth", () => ({ handleUnauthorizedAutoLogout: jest.fn() }))
jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQueryClient: () => ({ prefetchQuery: mockPrefetchQuery, prefetchInfiniteQuery: mockPrefetchInfiniteQuery }),
}))
jest.mock("@/hooks/useCollaborationRooms", () => ({
  useCollaborationRooms: () => ({ data: mockRooms, isPending: false, isError: false }),
  useCreateCollaborationRoom: () => ({ mutateAsync: mockCreate, isPending: false }),
}))
jest.mock("@/components/ui/button", () => ({
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    size?: string; variant?: string
  }) => {
    const label = React.Children.toArray(props.children).filter((child) => typeof child === "string").join("").trim()
    mockButtons.set(label, props)
    const htmlProps = { ...props }
    delete htmlProps.size
    delete htmlProps.variant
    return React.createElement("button", htmlProps)
  },
}))

const room = {
  id: "room-1", name: "리뷰 방", memberCount: 1, capacity: 8,
  members: [], owner: { name: "방장" },
} as unknown as CollaborationRoom

function render() {
  mockStateIndex = 0
  mockButtons.clear()
  return renderToStaticMarkup(React.createElement(CollaborationRoomPanel, {
    prId: "pr-1", currentUserId: "user-1",
  }))
}

function click(label: string) {
  mockButtons.get(label)!.onClick!({} as React.MouseEvent<HTMLButtonElement>)
}

describe("CollaborationRoomPanel entry overlay", () => {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document")

  beforeEach(() => {
    jest.clearAllMocks()
    mockState = []
    mockEnteringRef = { current: false }
    mockRooms = [room]
    Object.defineProperty(globalThis, "document", { configurable: true, value: { body: {} } })
  })

  afterAll(() => {
    if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument)
    else Reflect.deleteProperty(globalThis, "document")
  })

  it("shows the overlay immediately and keeps it after creation while navigation is pending", async () => {
    let resolveCreation!: (room: CollaborationRoom) => void
    mockCreate.mockReturnValue(new Promise<CollaborationRoom>((resolve) => { resolveCreation = resolve }))
    expect(render()).not.toContain('role="status"')
    click("협업방 시작")
    click("협업방 시작")
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(mockPush).not.toHaveBeenCalled()
    expect(render()).toContain('role="status"')
    expect(mockButtons.get("입장")!.disabled).toBe(true)
    resolveCreation(room)
    await Promise.resolve()
    expect(mockPush).toHaveBeenCalledWith("/collaboration/rooms/room-1")
    expect(render()).toContain('role="status"')
    expect(mockButtons.get("협업방 시작")!.disabled).toBe(true)
  })

  it("also covers existing-room navigation without creating a room", () => {
    render()
    click("입장")
    click("입장")
    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledTimes(1)
    expect(render()).toContain('aria-busy="true"')
    expect(render()).toContain("fixed inset-0")
  })

  it("prefetches only the hovered existing room route and messages without joining", () => {
    render()
    mockButtons.get("입장")!.onMouseEnter!({} as React.MouseEvent<HTMLButtonElement>)
    mockButtons.get("협업방 시작")!.onFocus!({} as React.FocusEvent<HTMLButtonElement>)

    expect(mockPrefetchQuery).toHaveBeenCalledTimes(2)
    expect(mockPrefetchQuery.mock.calls[0][0].queryKey).toEqual(["pullRequestFilesWithRevision", "pr-1"])
    expect(mockPrefetchQuery.mock.calls[1][0].queryKey).toEqual(["pullRequestFilesWithRevision", "pr-1"])
    expect(mockPrefetchRoute).toHaveBeenCalledTimes(1)
    expect(mockPrefetchRoute).toHaveBeenCalledWith("/collaboration/rooms/room-1")
    expect(mockPrefetchInfiniteQuery).toHaveBeenCalledTimes(1)
    expect(mockPrefetchInfiniteQuery.mock.calls[0][0].queryKey).toEqual(["collaborationMessages", "room-1"])
    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("removes the overlay on creation failure and permits a retry", async () => {
    mockCreate.mockRejectedValueOnce(new Error("생성 실패"))
    render()
    click("협업방 시작")
    await Promise.resolve()
    const html = render()
    expect(html).not.toContain('role="status"')
    expect(html).toContain("생성 실패")
    expect(mockButtons.get("협업방 시작")!.disabled).toBe(false)
    mockCreate.mockResolvedValueOnce(room)
    click("협업방 시작")
    await Promise.resolve()
    expect(mockPush).toHaveBeenCalledWith("/collaboration/rooms/room-1")
    expect(render()).not.toContain("생성 실패")
  })

  it("clears the overlay if starting navigation throws", () => {
    mockPush.mockImplementationOnce(() => { throw new Error("이동 실패") })
    render()
    click("입장")
    const html = render()
    expect(html).not.toContain('role="status"')
    expect(html).toContain("이동 실패")
    expect(mockButtons.get("입장")!.disabled).toBe(false)
  })

  it("keeps the capacity restriction before entry", () => {
    mockRooms = [{ ...room, occupiedCount: 8 }]
    expect(render()).not.toContain('role="status"')
    expect(mockButtons.get("입장")!.disabled).toBe(true)
  })
})
