import { auth } from "@/lib/auth"
import CommentsClient from "@/components/comment/CommentsClient"
import { fetchConnectedRepos } from "@/lib/comments"

export default async function CommentsPage() {
  const session = await auth()
  const repos = await fetchConnectedRepos()

  return <CommentsClient repos={repos} userId={session?.user?.id} />
}
