"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Settings } from "lucide-react"
import { useNotifications } from "@/hooks/useNotifications"
import { getNotificationLink } from "@/lib/notification-link"
import NotificationList from "@/components/notification/NotificationList"
import NotificationFilter from "@/components/notification/NotificationFilter"
import NotificationSettings from "@/components/notification/NotificationSettings"
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
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-slate-700" />
          <h1 className="text-xl font-bold text-slate-900">알림</h1>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-semibold rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllRead}
            className="text-sm text-blue-500 hover:text-blue-700 transition-colors"
          >
            모두 읽음 처리
          </button>
          <button
            onClick={() => setShowSettings((prev) => !prev)}
            className={`p-2 rounded-lg transition-colors ${
              showSettings ? "bg-blue-100 text-blue-600" : "hover:bg-slate-100 text-slate-500"
            }`}
            title="알림 설정"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="mb-6 bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">알림 구독 설정</h2>
          <NotificationSettings />
        </div>
      )}

      <div className="mb-4">
        <NotificationFilter
          typeFilter={typeFilter}
          readFilter={readFilter}
          onTypeChange={setTypeFilter}
          onReadChange={setReadFilter}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
    </div>
  )
}
