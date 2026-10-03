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

function render(open = false) {
  return renderToStaticMarkup(React.createElement(CollaborationDiffViewer, {
    lines,
    filePath: "src/app.ts",
    selection: null,
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
  it("shows line-level compose controls and existing conversation counts", () => {
    const html = render()
    expect(html).toContain("20번 줄 협업방 대화 2개 열기")
    expect(html).toContain("20번 줄에 협업방 메시지 작성")
    expect(html).not.toContain("undefined번 줄에 협업방 메시지 작성")
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
})
