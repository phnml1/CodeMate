import { auth } from "@/lib/auth";
import PRDetailContainer from "@/components/pulls/detail/PRDetailContainer";
import CommentSection from "@/components/comment/CommentSection";

interface PRDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PRDetailPage({ params }: PRDetailPageProps) {
  const { id } = await params;
  const session = await auth();
  const currentUserId = session?.user?.id ?? "";

  return (
    <PRDetailContainer
      id={id}
      commentSlot={<CommentSection prId={id} />}
      currentUserId={currentUserId}
    />
  );
}
