import type { Metadata } from "next"
import { Suspense } from "react"

import CommentLatencyMeasurementClient from "../../../../../components/measurements/CommentLatencyMeasurementClient"

export const metadata: Metadata = {
  title: "댓글 이벤트 latency 측정",
  description:
    "synthetic comment event의 캐시 기록부터 query 반영 관측까지의 latency를 측정하는 개발용 페이지입니다.",
}

export default function CommentLatencyMeasurementPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[320px] items-center justify-center text-sm text-slate-500">
          latency 측정 페이지를 불러오는 중...
        </div>
      }
    >
      <CommentLatencyMeasurementClient />
    </Suspense>
  )
}
