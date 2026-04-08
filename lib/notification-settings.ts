import { prisma } from "@/lib/prisma"
import type { NotificationType } from "@/types/notification"

// REVIEW_FAILED는 항상 전송 (사용자가 옵트아웃 불가한 critical 알림)
const TYPE_TO_SETTING_KEY: Partial<Record<NotificationType, string>> = {
  MENTION: "mentionEnabled",
  NEW_REVIEW: "newReviewEnabled",
  PR_MERGED: "prMergedEnabled",
  COMMENT_REPLY: "commentReplyEnabled",
}

/**
 * 사용자가 해당 알림 타입을 구독하고 있는지 확인
 * 설정이 없으면 기본적으로 모든 알림을 받음 (true 반환)
 */
export async function isNotificationEnabled(
  userId: string,
  type: NotificationType
): Promise<boolean> {
  const setting = await prisma.notificationSetting.findUnique({
    where: { userId },
  })

  const key = TYPE_TO_SETTING_KEY[type]
  if (!key) return true  // 설정 키가 없는 타입(REVIEW_FAILED 등)은 항상 전송

  if (!setting) return true

  return setting[key as keyof typeof setting] as boolean
}
