import type { Metadata } from "next"
import CommentsClient from "@/components/comment/CommentsClient"
import { getConnectedRepositoriesForUser } from "@/lib/dal/repositories"
import { requireCurrentUser } from "@/lib/dal/session"

export const metadata: Metadata = {
  title: "코드 리뷰",
  description: "PR과 실시간 리뷰방의 코드 리뷰를 확인하세요",
}

export default async function CommentsPage() {
  const user = await requireCurrentUser()
  const repos = await getConnectedRepositoriesForUser(user.id)

  return <CommentsClient repos={repos} userId={user.id} />
}
