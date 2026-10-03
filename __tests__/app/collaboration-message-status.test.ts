import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import CollaborationMessages from "@/components/collaboration/CollaborationMessages"
import InlineCollaborationThread from "@/components/collaboration/InlineCollaborationThread"
import { useCollaborationCodeThread } from "@/hooks/useCollaborationCodeThreads"
import type { CollaborationMessage } from "@/types/collaboration"

jest.mock("@/hooks/useCollaborationMessages", () => ({
  useCreateCollaborationMessage: () => ({ mutate: jest.fn() }),
}))
jest.mock("@/hooks/useCollaborationTyping", () => ({
  useCollaborationTyping: () => ({ updateTyping: jest.fn(), stopTyping: jest.fn() }),
}))
jest.mock("@/hooks/useCollaborationCodeThreads", () => ({
  useCollaborationCodeThread: jest.fn(),
}))

const codeReference = {
  filePath: "src/app.ts",
  side: "RIGHT" as const,
  startLine: 20,
  endLine: 20,
  baseSha: "a".repeat(40),
  headSha: "b".repeat(40),
}
const messages: CollaborationMessage[] = [
  { id: "old", roomId: "room-1", authorId: "me", author: { id: "me", name: "나", image: null }, content: "old", clientMessageId: "old", codeReference, createdAt: "2026-09-30T00:00:00Z", updatedAt: "2026-09-30T00:00:00Z" },
  { id: "pending", roomId: "room-1", authorId: "me", author: { id: "me", name: "나", image: null }, content: "pending", clientMessageId: "pending", codeReference, createdAt: "2026-09-30T00:01:00Z", updatedAt: "2026-09-30T00:01:00Z", deliveryStatus: "sending" },
  { id: "latest", roomId: "room-1", authorId: "me", author: { id: "me", name: "나", image: null }, content: "latest", clientMessageId: "latest", codeReference, createdAt: "2026-09-30T00:02:00Z", updatedAt: "2026-09-30T00:02:00Z" },
]

it("shows sent only on my latest room message while keeping pending status", () => {
  const html = renderToStaticMarkup(React.createElement(CollaborationMessages, {
    roomId: "room-1",
    currentUserId: "me",
    canSend: true,
    publishTyping: jest.fn(),
    typingNames: [],
    messages,
    messagesQuery: { isPending: false, isError: false, hasNextPage: false, data: { pages: [{ messages }] } } as never,
  }))
  expect(html.match(/전송됨/g)).toHaveLength(1)
  expect(html.match(/전송 중/g)).toHaveLength(2)
})

it("marks the message opened from a code notification in its inline thread", () => {
  ;(useCollaborationCodeThread as jest.Mock).mockReturnValue({
    isPending: false,
    isError: false,
    hasNextPage: false,
    data: { pages: [{ messages }] },
  })
  const html = renderToStaticMarkup(React.createElement(InlineCollaborationThread, {
    roomId: "room-1",
    anchor: codeReference,
    currentUserId: "me",
    canSend: true,
    focusComposer: false,
    targetMessageId: "old",
    typingNames: [],
    publishTyping: jest.fn(),
    onClose: jest.fn(),
  }))
  expect(html).toContain('data-collaboration-message-id="old"')
  expect(html).toContain("border-l-2 border-emerald-600")
})

it("shows sent only on my latest inline message while keeping pending status", () => {
  ;(useCollaborationCodeThread as jest.Mock).mockReturnValue({
    isPending: false,
    isError: false,
    hasNextPage: false,
    data: { pages: [{ messages }] },
  })
  const html = renderToStaticMarkup(React.createElement(InlineCollaborationThread, {
    roomId: "room-1",
    anchor: codeReference,
    currentUserId: "me",
    canSend: true,
    focusComposer: false,
    targetMessageId: null,
    typingNames: [],
    publishTyping: jest.fn(),
    onClose: jest.fn(),
  }))
  expect(html.match(/전송됨/g)).toHaveLength(1)
  expect(html.match(/전송 중/g)).toHaveLength(2)
})
