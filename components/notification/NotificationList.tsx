"use client"

import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import { AtSign, MessageSquare, GitPullRequest, GitMerge } from "lucide-react"
import type { Notification } from "@/types/notification"

const typeConfig: Record<
  string,
  { icon: typeof AtSign; label: string; color: string }
> = {
  MENTION: { icon: AtSign, label: "멘션", color: "text-blue-500" },
  COMMENT_REPLY: {
    icon: MessageSquare,
    label: "답글",
    color: "text-green-500",
  },
  NEW_REVIEW: {
    icon: GitPullRequest,
    label: "리뷰",
    color: "text-purple-500",
  },
  PR_MERGED: { icon: GitMerge, label: "머지", color: "text-orange-500" },
}

interface NotificationListProps {
  notifications: Notification[]
  onClickItem: (notification: Notification) => void
  onMarkAllRead: () => void
}

export default function NotificationList({
  notifications,
  onClickItem,
  onMarkAllRead,
}: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-slate-400">
        알림이 없습니다
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
        <span className="text-xs font-semibold text-slate-500">알림</span>
        <button
          onClick={onMarkAllRead}
          className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
        >
          모두 읽음
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.map((n) => {
          const config = typeConfig[n.type] ?? typeConfig.MENTION
          const Icon = config.icon
          return (
            <button
              key={n.id}
              onClick={() => onClickItem(n)}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 ${
                !n.isRead ? "bg-blue-50/50" : ""
              }`}
            >
              <div
                className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-slate-100 ${config.color}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm leading-snug ${!n.isRead ? "font-medium text-slate-900" : "text-slate-600"}`}
                >
                  {n.title}
                </p>
                {n.message && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {n.message}
                  </p>
                )}
                <p className="text-xs text-slate-300 mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), {
                    addSuffix: true,
                    locale: ko,
                  })}
                </p>
              </div>
              {!n.isRead && (
                <div className="mt-2 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
