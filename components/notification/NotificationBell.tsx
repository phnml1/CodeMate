"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bell } from "lucide-react"
import { useNotifications } from "@/hooks/useNotifications"
import { getNotificationLink } from "@/lib/notification-link"
import NotificationList from "./NotificationList"
import type { Notification } from "@/types/notification"

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { notifications, unreadCount, markAsRead, deleteNotification } = useNotifications()

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleClickItem = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead([notification.id])
    }
    setIsOpen(false)

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
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <div className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow-sm">
            <span className="text-white text-[10px] font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
          <NotificationList
            notifications={notifications}
            onClickItem={handleClickItem}
            onMarkAllRead={handleMarkAllRead}
            onDelete={handleDelete}
          />
          <div className="px-4 py-2 border-t border-slate-100">
            <button
              onClick={() => {
                setIsOpen(false)
                router.push("/notifications")
              }}
              className="w-full text-center text-xs text-blue-500 hover:text-blue-700 transition-colors"
            >
              모든 알림 보기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
