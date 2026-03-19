import { prisma } from "@/lib/prisma"
import type { NotificationType } from "@/types/notification"

const TYPE_TO_SETTING_KEY: Record<NotificationType, string> = {
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

  if (!setting) return true

  const key = TYPE_TO_SETTING_KEY[type] as keyof typeof setting
  return setting[key] as boolean
}
