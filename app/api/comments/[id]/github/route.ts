import { auth } from "@/lib/auth"
import { collaborationMessageInclude, serializeCollaborationMessage } from "@/lib/collaboration/rooms"
import { GitHubReviewPublicationError, publishCommentToGitHub } from "@/lib/github-review-publication"
import { prisma } from "@/lib/prisma"
import { emitCollaborationMessageUpdated } from "@/lib/socket/emitter"
import { NextResponse } from "next/server"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  try {
    const result = await publishCommentToGitHub(id, session.user.id)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof GitHubReviewPublicationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[github review] Unexpected publication error:", error)
    return NextResponse.json({ error: "GitHub 리뷰 전송에 실패했습니다." }, { status: 500 })
  } finally {
    try {
      const message = await prisma.collaborationMessage.findFirst({
        where: { authorId: session.user.id, reviewComment: { is: { id } } },
        include: collaborationMessageInclude,
      })
      if (message?.reviewComment &&
        (message.reviewComment.githubStatus === "PUBLISHED" || message.reviewComment.githubStatus === "FAILED")) {
        await emitCollaborationMessageUpdated(serializeCollaborationMessage(message))
      }
    } catch (error) {
      console.error("[github review] Collaboration status broadcast failed:", error)
    }
  }
}
