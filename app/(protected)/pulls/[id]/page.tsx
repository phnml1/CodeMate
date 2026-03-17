import PRDetailContainer from "@/components/pulls/detail/PRDetailContainer";
import CommentSection from "@/components/comment/CommentSection";

interface PRDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PRDetailPage({ params }: PRDetailPageProps) {
  const { id } = await params;
  return (
    <PRDetailContainer
      id={id}
      commentSlot={<CommentSection prId={id} />}
    />
  );
}
