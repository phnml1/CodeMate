import PRDetailContainer from "./PRDetailContainer";

interface PRDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PRDetailPage({ params }: PRDetailPageProps) {
  const { id } = await params;
  return <PRDetailContainer id={id} />;
}
