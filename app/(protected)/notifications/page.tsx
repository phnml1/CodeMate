import type { Metadata } from "next"
import NotificationsClient from "@/components/notifications/NotificationsClient"

export const metadata: Metadata = {
  title: "알림",
  description: "코드 리뷰 알림 및 피드백을 확인하세요",
}

export default function NotificationsPage() {
  return <NotificationsClient />
}
