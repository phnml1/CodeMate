import type { Metadata } from "next"
import { Suspense } from "react"
import PRFilterBar from "@/components/pulls/PRFilterBar"
import PRList from "@/components/pulls/PRList"
import PRPageHeader from "@/components/pulls/PRPageHeader"

export const metadata: Metadata = {
  title: "Pull Requests",
  description: "모든 Pull Request를 검토하고 AI 코드 리뷰를 확인하세요",
}

export default function Page() {
  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <PRPageHeader />
        <PRFilterBar />
        <Suspense>
          <PRList />
        </Suspense>
      </div>
    </div>
  );
}
