import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import CollaborationDiffViewer from "@/components/collaboration/CollaborationDiffViewer"
import { assignParticipantColors } from "@/lib/collaboration/participant-colors"
import type { DiffLine } from "@/lib/diff"
import type { ReviewIssue } from "@/types/review"

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

function render(
  open = false,
  selection: { side: "LEFT" | "RIGHT"; startLine: number; endLine: number } | null = null,
  issues: ReviewIssue[] = []
) {
  return renderToStaticMarkup(React.createElement(CollaborationDiffViewer, {
    lines,
    filePath: "src/app.ts",
    selection,
    sharedLocations: [],
    participantColors: assignParticipantColors(["user-1"]),
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
    issues,
    onIssueClick: jest.fn(),
  }))
}

describe("CollaborationDiffViewer", () => {
  it("distinguishes the local selection from added diff lines", () => {
    const html = render(false, { side: "RIGHT", startLine: 20, endLine: 20 })
    const ownColor = assignParticipantColors(["user-1"])["user-1"]
    expect(html).toContain(`color:${ownColor.solid}`)
    expect(html).toContain(`box-shadow:inset 3px 0 ${ownColor.solid}`)
    expect(html).toContain(`background-image:linear-gradient(${ownColor.fill}, ${ownColor.fill})`)
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

  it("renders AI review issues directly below their changed code line", () => {
    const html = render(false, null, [{
      originalIndex: 0,
      filePath: "src/app.ts",
      lineNumber: 20,
      severity: "HIGH",
      category: "BUG",
      title: "널 검사 누락",
      description: "값이 없을 때 예외가 발생할 수 있습니다.",
      suggestion: "사용 전에 값을 검사하세요.",
    }])

    expect(html).toContain("널 검사 누락")
    expect(html).toContain("값이 없을 때 예외가 발생할 수 있습니다.")
    expect(html).toContain("널 검사 누락 이슈 자세히 보기")
    expect(html.indexOf('data-code-line="20"')).toBeLessThan(
      html.indexOf("값이 없을 때 예외가 발생할 수 있습니다.")
    )
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
      participantColors: assignParticipantColors(["user-1", "user-2"]),
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
      participantColors: assignParticipantColors(["user-1", "user-2"]),
      typingUsers: [], publishTyping: jest.fn(), onLineSelect: jest.fn(),
      roomId: "room-1", currentUserId: "user-1", canSend: true,
      threadSummaries: [], inlineThread: null, onOpenThread: jest.fn(), onCloseThread: jest.fn(),
    }))
    const remoteFill = assignParticipantColors(["user-1", "user-2"])["user-2"].fill
    expect(html.match(new RegExp(`data-code-line="(?:20|21|22)"[^>]*background-image:linear-gradient\\(${remoteFill.replace(/[()]/g, "\\$&")}`, "g"))).toHaveLength(3)
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
      participantColors: assignParticipantColors(["user-1", "user-2", "user-3", "user-4"]),
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
    for (const user of sharedLocations) {
      expect(html).toContain(`background-color:${assignParticipantColors(["user-1", "user-2", "user-3", "user-4"])[user.userId].solid}`)
    }
    const codeCell = html.match(/<td data-code-side="RIGHT" data-code-line="20"[^>]*>(.*?)<\/td>/)?.[1]
    expect(codeCell?.replace(/<[^>]+>/g, "")).toBe("after")
  })
})
