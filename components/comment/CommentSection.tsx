import { auth } from "@/lib/auth"
import CommentList from "./CommentList"

interface CommentSectionProps {
  prId: string
}

export default async function CommentSection({ prId }: CommentSectionProps) {
  const session = await auth()
  const currentUserId = session?.user?.id ?? ""

  return <CommentList prId={prId} currentUserId={currentUserId} />
}
