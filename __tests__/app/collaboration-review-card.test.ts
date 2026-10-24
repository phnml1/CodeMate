import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import CommentCard from "@/components/comment/CommentCard"
import type { CommentWithPR } from "@/types/comment"

const comment: CommentWithPR = {
  id: "review-1",
  content: "이 조건을 확인해 주세요",
  lineNumber: null,
  filePath: null,
  isResolved: false,
  pullRequestId: "pr-1",
  authorId: "user-1",
  parentId: null,
  mentions: [],
  reactions: {},
  createdAt: "2026-10-23T00:00:00.000Z",
  updatedAt: "2026-10-23T00:00:00.000Z",
  author: { id: "user-1", name: "Reviewer", image: null },
  pullRequest: { id: "pr-1", title: "Fix code", number: 7, repoId: "repo-1", repo: { name: "CodeMate" } },
  collaborationMessage: {
    roomId: "room-1",
    codeReference: { filePath: "app/page.tsx", side: "RIGHT", startLine: 10, endLine: 12 },
  },
}

it("shows a collaboration code review and its original location in the review list", () => {
  const html = renderToStaticMarkup(React.createElement(CommentCard, { comment, onClick: jest.fn() }))

  expect(html).toContain("이 조건을 확인해 주세요")
  expect(html).toContain("app/page.tsx")
  expect(html).toContain(":10")
  expect(html).toContain("리뷰방")
})
