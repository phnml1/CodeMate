import { auth } from "@/lib/auth"
import { getPullRequestDetailForUser } from "@/lib/pr-detail/pullRequestDetail"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const pr = await getPullRequestDetailForUser(id, session.user.id)

    if (!pr) {
      return NextResponse.json({ error: "Pull request not found" }, { status: 404 })
    }

    return NextResponse.json(pr)
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
