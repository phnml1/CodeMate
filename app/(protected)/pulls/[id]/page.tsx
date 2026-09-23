import type { Metadata } from "next"
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { notFound } from "next/navigation"
import { requireCurrentUser } from "@/lib/dal/session"
import PRDetailContainer from "@/components/pulls/detail/PRDetailContainer"
import CommentSection from "@/components/comment/CommentSection"
import { getPullRequestDetailForUser } from "@/lib/pr-detail/pullRequestDetail"
import { prDetailQueryKey } from "@/lib/query-keys"

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
  const user = await requireCurrentUser();
  const initialPullRequest = await getPullRequestDetailForUser(id, user.id);
  if (!initialPullRequest) notFound();

  const queryClient = new QueryClient();
  queryClient.setQueryData(prDetailQueryKey(id), initialPullRequest);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PRDetailContainer
        id={id}
        commentSlot={<CommentSection prId={id} />}
        currentUserId={user.id}
      />
    </HydrationBoundary>
  );
}
