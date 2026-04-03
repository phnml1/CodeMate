import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import CommentsClient from "@/components/comment/CommentsClient"
import { fetchConnectedRepos } from "@/lib/comments"

export const metadata: Metadata = {
  title: "코드 리뷰 댓글",
  description: "AI 코드 리뷰 댓글 및 피드백을 관리하세요",
}

export default async function CommentsPage() {
  const session = await auth()
  const repos = await fetchConnectedRepos()

  return <CommentsClient repos={repos} userId={session?.user?.id} />
}
