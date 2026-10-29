import { auth } from "@/lib/auth"
import { GitHubReviewPublicationError, publishCommentToGitHub } from "@/lib/github-review-publication"
import { NextResponse } from "next/server"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const result = await publishCommentToGitHub(id, session.user.id)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof GitHubReviewPublicationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[github review] Unexpected publication error:", error)
    return NextResponse.json({ error: "GitHub 리뷰 전송에 실패했습니다." }, { status: 500 })
  }
}
