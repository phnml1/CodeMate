import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import CollaborationDiffViewer from "@/components/collaboration/CollaborationDiffViewer"
import type { DiffLine } from "@/lib/diff"

jest.mock("@/components/collaboration/InlineCollaborationThread", () =>
  function InlineThreadMock() {
    return React.createElement("div", null, "inline-thread")
  }
)

const lines: DiffLine[] = [
  { type: "hunk", content: "@@ -10 +20 @@" },
  { type: "removed", content: "before", oldNum: 10 },
  { type: "added", content: "after", newNum: 20 },
  { type: "context", content: "\\ No newline at end of file" },
]

function render(open = false, selection: { side: "LEFT" | "RIGHT"; startLine: number; endLine: number } | null = null) {
  return renderToStaticMarkup(React.createElement(CollaborationDiffViewer, {
    lines,
    filePath: "src/app.ts",
    selection,
    sharedLocations: [],
    typingUsers: [],
    publishTyping: jest.fn(),
    onLineSelect: jest.fn(),
    roomId: "room-1",
    currentUserId: "user-1",
    canSend: true,
    threadSummaries: [{ side: "RIGHT", startLine: 20, count: 2 }],
    inlineThread: open ? {
      filePath: "src/app.ts",
      side: "RIGHT",
      startLine: 20,
      endLine: 20,
      baseSha: "a".repeat(40),
      headSha: "b".repeat(40),
      focusComposer: false,
      displayIndex: 2,
      targetMessageId: null,
    } : null,
    onOpenThread: jest.fn(),
    onCloseThread: jest.fn(),
  }))
}

describe("CollaborationDiffViewer", () => {
  it("distinguishes the local selection from added diff lines", () => {
    const html = render(false, { side: "RIGHT", startLine: 20, endLine: 20 })
    expect(html).toMatch(/data-diff-line="20"[^>]*text-violet-700/)
    expect(html).toMatch(/data-code-line="20"[^>]*bg-violet-200\/80/)
    expect(html).not.toMatch(/data-code-line="20"[^>]*bg-emerald-100\/80/)
  })

  it("shows line-level compose controls and existing conversation counts", () => {
    const html = render()
    expect(html).toContain("20번 줄 리뷰방 대화 2개 열기")
    expect(html).toContain("20번 줄에 리뷰방 메시지 작성")
    expect(html).not.toContain("undefined번 줄에 리뷰방 메시지 작성")
  })

  it("keeps a selectable old line number in the single mobile number column", () => {
    const html = render()
    expect(html.match(/data-diff-side="LEFT" data-diff-line="10"/g)).toHaveLength(2)
    expect(html).toContain("hidden sm:table-cell")
    expect(html).toContain("sm:hidden")
  })

  it("keeps a selectable old line number in the single mobile number column", () => {
    const html = render()
    expect(html.match(/data-diff-side="LEFT" data-diff-line="10"/g)).toHaveLength(2)
    expect(html).toContain("hidden sm:table-cell")
    expect(html).toContain("sm:hidden")
  })

  it("expands an inline conversation under its code row", () => {
    expect(render(true)).toContain("inline-thread")
  })

  it("marks the exact text selected by another participant", () => {
    const html = renderToStaticMarkup(React.createElement(CollaborationDiffViewer, {
      lines,
      filePath: "src/app.ts",
      selection: null,
      sharedLocations: [{
        roomId: "room-1",
        userId: "user-2",
        userName: "상대",
        filePath: "src/app.ts",
        baseSha: "a".repeat(40),
        headSha: "b".repeat(40),
        side: "RIGHT",
        line: 20,
        selection: null,
        textSelection: { side: "RIGHT", startLine: 20, endLine: 20, startOffset: 1, endOffset: 4 },
        updatedAt: new Date().toISOString(),
      }],
      typingUsers: [],
      publishTyping: jest.fn(),
      onLineSelect: jest.fn(),
      roomId: "room-1",
      currentUserId: "user-1",
      canSend: true,
      threadSummaries: [],
      inlineThread: null,
      onOpenThread: jest.fn(),
      onCloseThread: jest.fn(),
    }))
    expect(html).toContain('data-code-line="20"')
    expect(html).toContain('>a<mark title="상대님이 선택한 텍스트"')
    expect(html).toContain('>fte</mark>')
  })

  it("highlights every code row in another participant's dragged range", () => {
    const rangeLines: DiffLine[] = [
      { type: "added", content: "first line", newNum: 20 },
      { type: "context", content: "middle line", oldNum: 11, newNum: 21 },
      { type: "added", content: "last line", newNum: 22 },
    ]
    const html = renderToStaticMarkup(React.createElement(CollaborationDiffViewer, {
      lines: rangeLines,
      filePath: "src/app.ts",
      selection: null,
      sharedLocations: [{
        roomId: "room-1", userId: "user-2", userName: "상대",
        filePath: "src/app.ts", baseSha: "a".repeat(40), headSha: "b".repeat(40),
        side: "RIGHT", line: 22,
        selection: { side: "RIGHT", startLine: 20, endLine: 22 },
        textSelection: { side: "RIGHT", startLine: 20, endLine: 22, startOffset: 2, endOffset: 4 },
        updatedAt: new Date().toISOString(),
      }],
      typingUsers: [], publishTyping: jest.fn(), onLineSelect: jest.fn(),
      roomId: "room-1", currentUserId: "user-1", canSend: true,
      threadSummaries: [], inlineThread: null, onOpenThread: jest.fn(), onCloseThread: jest.fn(),
    }))
    expect(html.match(/data-code-line="(?:20|21|22)"[^>]*bg-sky-100\/80/g)).toHaveLength(3)
    expect(html.match(/title="상대님이 선택한 텍스트"/g)).toHaveLength(3)
  })

  it("shows three distinct, non-interactive peer labels and overlapping text selections", () => {
    const sharedLocations = [
      { userId: "user-2", userName: "Mina", endOffset: 4 },
      { userId: "user-3", userName: "Joon", endOffset: 5 },
      { userId: "user-4", userName: "Alex", endOffset: null },
    ].map(({ userId, userName, endOffset }) => ({
      roomId: "room-1", userId, userName, filePath: "src/app.ts",
      baseSha: "a".repeat(40), headSha: "b".repeat(40),
      side: "RIGHT" as const, line: 20,
      selection: endOffset === null ? null : { side: "RIGHT" as const, startLine: 20, endLine: 20 },
      textSelection: endOffset === null ? null : { side: "RIGHT" as const, startLine: 20, endLine: 20, startOffset: endOffset === 4 ? 1 : 2, endOffset },
      updatedAt: new Date().toISOString(),
    }))
    const html = renderToStaticMarkup(React.createElement(CollaborationDiffViewer, {
      lines, filePath: "src/app.ts", selection: null, sharedLocations,
      typingUsers: [], publishTyping: jest.fn(), onLineSelect: jest.fn(),
      roomId: "room-1", currentUserId: "user-1", canSend: true,
      threadSummaries: [], inlineThread: null, onOpenThread: jest.fn(), onCloseThread: jest.fn(),
    }))

    expect(html.match(/data-remote-location-labels/g)).toHaveLength(1)
    expect(html).toContain("pointer-events-none")
    expect(html).toContain("Mina")
    expect(html).toContain("Joon")
    expect(html).toContain("Alex")
    expect(html).toContain('title="Mina, Joon님이 선택한 텍스트"')
    expect(html).toContain("linear-gradient(to bottom")
    const codeCell = html.match(/<td data-code-side="RIGHT" data-code-line="20"[^>]*>(.*?)<\/td>/)?.[1]
    expect(codeCell?.replace(/<[^>]+>/g, "")).toBe("after")
  })
})
