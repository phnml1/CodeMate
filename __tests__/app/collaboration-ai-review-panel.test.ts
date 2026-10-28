import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import CollaborationAIReviewPanel from "@/components/collaboration/CollaborationAIReviewPanel"
import { useCollaborationReviewMessages } from "@/hooks/useCollaborationReviewThreads"
import { usePRReviewActions } from "@/hooks/pr-detail/usePRReviewActions"
import { useReviewQuery } from "@/hooks/useReview"

jest.mock("@/hooks/useReview", () => ({ useReviewQuery: jest.fn() }))
jest.mock("@/hooks/useCollaborationReviewThreads", () => ({
  useCollaborationReviewMessages: jest.fn(),
}))
jest.mock("@/hooks/pr-detail/usePRReviewActions", () => ({
  usePRReviewActions: jest.fn(),
}))

describe("CollaborationAIReviewPanel", () => {
  beforeEach(() => {
    ;(useReviewQuery as jest.Mock).mockReturnValue({
      data: {
        id: "review-1",
        pullRequestId: "pr-1",
        qualityScore: 82,
        severity: "MEDIUM",
        issueCount: 1,
        status: "COMPLETED",
        stage: "COMPLETED",
        reviewedAt: "2026-10-28T00:00:00.000Z",
        aiSuggestions: {
          overallAssessment: "COMMENT",
          summary: "전반적으로 안전하지만 한 곳을 확인해야 합니다.",
          issues: [{
            filePath: "app/page.tsx",
            lineNumber: 42,
            severity: "MEDIUM",
            category: "QUALITY",
            title: "중복된 조건문",
            description: "조건문이 중복됩니다.",
            suggestion: "조건을 함수로 추출하세요.",
          }],
        },
      },
      isPending: false,
      isError: false,
      refetch: jest.fn(),
    })
    ;(usePRReviewActions as jest.Mock).mockReturnValue({
      requestReview: jest.fn(),
      isRequesting: false,
      requestError: null,
    })
    ;(useCollaborationReviewMessages as jest.Mock).mockReturnValue({
      data: {
        messages: [{
          id: "message-1",
          roomId: "room-1",
          authorId: "user-2",
          author: { id: "user-2", name: "Reviewer", image: null },
          content: "이 부분은 유지해도 될 것 같습니다.",
          clientMessageId: null,
          codeReference: null,
          reviewReference: { reviewId: "review-1", issueIndex: 0 },
          createdAt: "2026-10-28T00:00:00.000Z",
          updatedAt: "2026-10-28T00:00:00.000Z",
        }],
      },
      isPending: false,
      isError: false,
      refetch: jest.fn(),
    })
  })

  it("shows the AI review and the live discussion count for each issue", () => {
    const html = renderToStaticMarkup(React.createElement(CollaborationAIReviewPanel, {
      roomId: "room-1",
      prId: "pr-1",
      currentUserId: "user-1",
      canSend: true,
      realtimeConnected: true,
      focusReference: null,
      onOpenIssue: jest.fn(),
    }))

    expect(html).toContain("AI 리뷰")
    expect(html).toContain("전반적으로 안전하지만 한 곳을 확인해야 합니다.")
    expect(html).toContain("중복된 조건문")
    expect(html).toContain("코멘트 1개")
    expect(html).toContain("코드로 이동")
  })
})
