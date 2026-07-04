import type { Metadata } from "next"

import SocketMeasurementClient from "@/components/measurements/SocketMeasurementClient"

export const metadata: Metadata = {
  title: "WebSocket 연결 구조 측정",
  description:
    "WebSocket 연결 수, room join/leave, 이벤트 handler 등록 상태를 같은 탭에서 계측하는 개발용 측정 페이지입니다.",
}

export default function SocketMeasurementPage() {
  return <SocketMeasurementClient />
}
