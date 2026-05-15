import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import PRDetailContainer from "@/components/pulls/detail/PRDetailContainer"
import CommentSection from "@/components/comment/CommentSection"
import { getPullRequestDetailForUser } from "@/lib/pr-detail/pullRequestDetail"

interface PRDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: PRDetailPageProps): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Pull Request #${id}`,
    description: "Pull Request의 상세 정보와 AI 코드 리뷰를 확인하세요",
  }
}

export default async function PRDetailPage({ params }: PRDetailPageProps) {
  const { id } = await params;
  const session = await auth();
  const currentUserId = session?.user?.id ?? "";
  const initialPullRequest = session?.user?.id
    ? await getPullRequestDetailForUser(id, session.user.id)
    : null;

  return (
    <PRDetailContainer
      id={id}
      commentSlot={<CommentSection prId={id} />}
      currentUserId={currentUserId}
      initialPullRequest={initialPullRequest}
    />
  );
}
