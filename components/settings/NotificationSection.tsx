"use client"

import { useNotificationSettings } from "@/hooks/useNotificationSettings"
import type { NotificationSetting } from "@/types/notification"
import { surfaceStyles, textStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"

const settingItems: { key: keyof NotificationSetting; label: string; description: string }[] = [
  {
    key: "mentionEnabled",
    label: "멘션 알림",
    description: "댓글에서 멘션되었을 때 알림을 받습니다.",
  },
  {
    key: "newReviewEnabled",
    label: "리뷰 완료 알림",
    description: "AI 코드 리뷰가 완료되었을 때 알림을 받습니다.",
  },
  {
    key: "prMergedEnabled",
    label: "PR 병합/닫힘 알림",
    description: "PR이 병합되거나 닫혔을 때 알림을 받습니다.",
  },
  {
    key: "commentReplyEnabled",
    label: "댓글 알림",
    description: "PR에 새 댓글이 달렸을 때 알림을 받습니다.",
  },
]

export default function NotificationSection() {
  const { settings, isLoading, saveSettings } = useNotificationSettings()

  if (isLoading) {
    return (
      <section className={cn(surfaceStyles.panel, surfaceStyles.panelPadding)}>
        <h2 className={cn(textStyles.sectionTitle, "mb-4")}>알림 설정</h2>
        <p className="text-sm text-slate-400">설정을 불러오는 중...</p>
      </section>
    )
  }

  return (
    <section className={cn(surfaceStyles.panel, surfaceStyles.panelPadding)}>
      <h2 className={cn(textStyles.sectionTitle, "mb-4")}>알림 설정</h2>
      <div className="space-y-1">
        {settingItems.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between px-2 py-3 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-slate-700">{item.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
            </div>
            <button
              onClick={() => saveSettings({ ...settings, [item.key]: !settings[item.key] })}
              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                settings[item.key] ? "bg-blue-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  settings[item.key] ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
