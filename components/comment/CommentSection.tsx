import { requireCurrentUser } from "@/lib/dal/session"
import CommentList from "./CommentList"

interface CommentSectionProps {
  prId: string
}

export default async function CommentSection({ prId }: CommentSectionProps) {
  const user = await requireCurrentUser()

  return <CommentList prId={prId} currentUserId={user.id} />
}
