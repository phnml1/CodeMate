import type { Metadata } from "next"
import { Suspense } from "react"
import PRFilterBar from "@/components/pulls/PRFilterBar"
import PRList from "@/components/pulls/PRList"
import PRPageHeader from "@/components/pulls/PRPageHeader"
import { PageContainer } from "@/components/layout/PageContainer"

export const metadata: Metadata = {
  title: "Pull Requests",
  description: "모든 Pull Request를 검토하고 AI 코드 리뷰를 확인하세요",
}

export default function Page() {
  return (
    <PageContainer>
      <PRPageHeader />
      <PRFilterBar />
      <Suspense>
        <PRList />
      </Suspense>
    </PageContainer>
  );
}
