import { PageHeader } from "@/components/layout/PageHeader";
import PRRepositoryFilter from "@/components/pulls/PRRepositoryFilter";

export default function PRPageHeader() {
  return (
    <PageHeader
      title="Pull Requests"
      description="변경된 코드를 함께 검토하고, 리뷰와 실시간 리뷰방에서 의견을 나눠요."
      actions={<PRRepositoryFilter />}
    />
  );
}
