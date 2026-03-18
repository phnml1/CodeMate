import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  // TODO: 실제 알림 조회 구현 (Notification 모델 사용)
  // 현재는 빈 배열 반환
  return Response.json({
    notifications: [],
    unreadCount: 0,
  })
}
