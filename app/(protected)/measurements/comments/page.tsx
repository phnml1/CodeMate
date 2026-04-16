import type { Metadata } from "next"
import { Suspense } from "react"

import CommentCacheMeasurementClient from "../../../../components/measurements/CommentCacheMeasurementClient"

export const metadata: Metadata = {
  title: "댓글 캐시 동기화 측정",
  description:
    "댓글 캐시 동기화 전략별 API 요청 수, render commit 수, commit duration을 비교하는 개발용 측정 페이지입니다.",
}

export default function CommentCacheMeasurementPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[320px] items-center justify-center text-sm text-slate-500">
          측정 페이지를 불러오는 중...
        </div>
      }
    >
      <CommentCacheMeasurementClient />
    </Suspense>
  )
}
