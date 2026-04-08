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
 * 사용자가 해당 알림 타입을 구독하고 있는지 확인 (단건)
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

/**
 * 여러 사용자 중 해당 알림 타입이 활성화된 userId 배열 반환 (배치 조회)
 * - N+1 쿼리 방지: findMany + IN 조건으로 단일 쿼리 처리
 * - 설정 레코드가 없는 사용자는 기본값 true (isNotificationEnabled와 동일)
 * - 설정 키가 없는 타입(REVIEW_FAILED 등)은 userIds 전체 반환
 */
export async function getEnabledUserIds(
  userIds: string[],
  type: NotificationType
): Promise<string[]> {
  if (userIds.length === 0) return []

  const key = TYPE_TO_SETTING_KEY[type]
  if (!key) return userIds  // 옵트아웃 불가 타입 → 전원 대상

  const settings = await prisma.notificationSetting.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, [key]: true },
  })

  const settingsMap = new Map(
    settings.map((s) => [s.userId, s[key as keyof typeof s] as boolean])
  )

  // Map에 없는 userId = 설정 레코드 없음 → 기본값 true
  return userIds.filter((userId) => settingsMap.get(userId) ?? true)
}
