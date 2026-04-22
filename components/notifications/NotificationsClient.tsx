"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Settings } from "lucide-react"
import { useNotifications } from "@/hooks/useNotifications"
import { getNotificationLink } from "@/lib/notification-link"
import NotificationList from "@/components/notification/NotificationList"
import NotificationFilter from "@/components/notification/NotificationFilter"
import NotificationSettings from "@/components/notification/NotificationSettings"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { controlStyles, surfaceStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"
import type {
  Notification,
  NotificationFilterType,
  NotificationFilterRead,
} from "@/types/notification"

export default function NotificationsClient() {
  const router = useRouter()
  const [typeFilter, setTypeFilter] = useState<NotificationFilterType>("ALL")
  const [readFilter, setReadFilter] = useState<NotificationFilterRead>("all")
  const [showSettings, setShowSettings] = useState(false)

  const { notifications, unreadCount, isLoading, markAsRead, deleteNotification } =
    useNotifications(typeFilter, readFilter)

  const handleClickItem = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead([notification.id])
    }
    const link = getNotificationLink(notification)
    if (link) {
      router.push(link)
    }
  }

  const handleMarkAllRead = () => {
    markAsRead(undefined)
  }

  const handleDelete = (id: string) => {
    deleteNotification(id)
  }

  return (
    <PageContainer>
      <PageHeader
        title="알림"
        description="코드 리뷰 알림과 피드백을 확인하세요."
        icon={<Bell className="size-5" aria-hidden />}
        badge={
          unreadCount > 0 ? (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
              {unreadCount}
            </span>
          ) : null
        }
        actions={
          <>
          <button
            onClick={handleMarkAllRead}
            className="text-sm text-blue-500 hover:text-blue-700 transition-colors"
          >
            모두 읽음 처리
          </button>
          <button
            onClick={() => setShowSettings((prev) => !prev)}
            className={cn(
              controlStyles.iconButton,
              showSettings ? "bg-blue-100 text-blue-600" : "hover:bg-slate-100 text-slate-500"
            )}
            title="알림 설정"
          >
            <Settings className="w-5 h-5" />
          </button>
          </>
        }
      />

      {showSettings && (
        <div className={cn(surfaceStyles.panel, surfaceStyles.panelPadding)}>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">알림 구독 설정</h2>
          <NotificationSettings />
        </div>
      )}

      <div className={surfaceStyles.toolbar}>
        <NotificationFilter
          typeFilter={typeFilter}
          readFilter={readFilter}
          onTypeChange={setTypeFilter}
          onReadChange={setReadFilter}
        />
      </div>

      <div className={cn(surfaceStyles.panel, "overflow-hidden")}>
        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">
            알림을 불러오는 중...
          </div>
        ) : (
          <NotificationList
            notifications={notifications}
            onClickItem={handleClickItem}
            onMarkAllRead={handleMarkAllRead}
            onDelete={handleDelete}
            showHeader={false}
          />
        )}
      </div>
    </PageContainer>
  )
}
