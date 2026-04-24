import { PageHeader } from "@/components/layout/PageHeader";
import PRRepositoryFilter from "@/components/pulls/PRRepositoryFilter";

export default function PRPageHeader() {
  return (
    <PageHeader
      title="Pull Requests"
      description="저장소별 코드 변경 사항을 확인하고 병합 흐름을 관리해요."
      actions={<PRRepositoryFilter />}
    />
  );
}
