"use client";

import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import {
  AlertCircle,
  AtSign,
  CheckCircle2,
  GitMerge,
  GitPullRequest,
  Loader2,
  MessageSquare,
  X,
} from "lucide-react";
import type { Notification } from "@/types/notification";

const typeConfig: Record<
  string,
  { icon: typeof AtSign; label: string; color: string; bgColor: string }
> = {
  MENTION: { icon: AtSign, label: "멘션", color: "text-blue-500", bgColor: "bg-blue-50" },
  COMMENT_REPLY: {
    icon: MessageSquare,
    label: "답글",
    color: "text-green-500",
    bgColor: "bg-green-50",
  },
  NEW_REVIEW: {
    icon: GitPullRequest,
    label: "리뷰",
    color: "text-purple-500",
    bgColor: "bg-purple-50",
  },
  PR_MERGED: {
    icon: GitMerge,
    label: "머지",
    color: "text-orange-500",
    bgColor: "bg-orange-50",
  },
};

function getReviewStatusMeta(notification: Notification) {
  switch (notification.reviewStatus) {
    case "PENDING":
      return {
        icon: Loader2,
        label: "AI 리뷰 대기 중",
        color: "text-blue-500",
        bgColor: "bg-blue-50",
        iconClassName: "animate-spin",
      };
    case "FAILED":
      return {
        icon: AlertCircle,
        label: "AI 리뷰 실패",
        color: "text-rose-500",
        bgColor: "bg-rose-50",
        iconClassName: "",
      };
    case "COMPLETED":
      return {
        icon: CheckCircle2,
        label: "AI 리뷰 완료",
        color: "text-emerald-500",
        bgColor: "bg-emerald-50",
        iconClassName: "",
      };
    default:
      return null;
  }
}

interface NotificationListProps {
  notifications: Notification[];
  onClickItem: (notification: Notification) => void;
  onMarkAllRead: () => void;
  onDelete?: (id: string) => void;
  showHeader?: boolean;
}

export default function NotificationList({
  notifications,
  onClickItem,
  onMarkAllRead,
  onDelete,
  showHeader = true,
}: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-slate-400">
        알림이 없습니다
      </div>
    );
  }

  return (
    <div>
      {showHeader && (
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
          <span className="text-xs font-semibold text-slate-500">알림</span>
          <button
            onClick={onMarkAllRead}
            className="text-xs text-blue-500 transition-colors hover:text-blue-700"
          >
            모두 읽음
          </button>
        </div>
      )}
      <div className="max-h-80 overflow-y-auto">
        {notifications.map((notification) => {
          const reviewStatusMeta =
            notification.type === "NEW_REVIEW"
              ? getReviewStatusMeta(notification)
              : null;
          const config =
            reviewStatusMeta ?? typeConfig[notification.type] ?? typeConfig.MENTION;
          const Icon = config.icon;

          return (
            <div
              key={notification.id}
              className={`group relative flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                !notification.isRead ? "bg-blue-50/50" : ""
              }`}
            >
              <button
                onClick={() => onClickItem(notification)}
                className="flex min-w-0 flex-1 items-start gap-3 text-left"
              >
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${config.bgColor} ${config.color}`}
                >
                  <Icon className={`h-3.5 w-3.5 ${reviewStatusMeta?.iconClassName ?? ""}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm leading-snug ${
                        !notification.isRead
                          ? "font-medium text-slate-900"
                          : "text-slate-600"
                      }`}
                    >
                      {notification.title}
                    </p>
                    {reviewStatusMeta && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${reviewStatusMeta.bgColor} ${reviewStatusMeta.color}`}
                      >
                        {reviewStatusMeta.label}
                      </span>
                    )}
                  </div>
                  {notification.prTitle && (
                    <p className="mt-0.5 truncate text-xs text-blue-500">
                      {notification.repoFullName && (
                        <span className="text-slate-400">{notification.repoFullName} </span>
                      )}
                      #{notification.prNumber} {notification.prTitle}
                    </p>
                  )}
                  {notification.message && (
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {notification.message}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-300">
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                      locale: ko,
                    })}
                  </p>
                </div>
              </button>
              <div className="mt-1 flex shrink-0 items-center gap-1">
                {!notification.isRead && <div className="h-2 w-2 rounded-full bg-blue-500" />}
                {onDelete && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(notification.id);
                    }}
                    className="rounded p-0.5 opacity-0 transition-all group-hover:opacity-100 hover:bg-slate-200"
                    title="알림 삭제"
                  >
                    <X className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
