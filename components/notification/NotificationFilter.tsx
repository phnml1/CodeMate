"use client"

import { AtSign, MessageSquare, GitPullRequest, GitMerge } from "lucide-react"
import type { NotificationFilterType, NotificationFilterRead } from "@/types/notification"

const typeOptions: { value: NotificationFilterType; label: string; icon: typeof AtSign }[] = [
  { value: "ALL", label: "전체", icon: AtSign },
  { value: "MENTION", label: "멘션", icon: AtSign },
  { value: "COMMENT_REPLY", label: "답글", icon: MessageSquare },
  { value: "NEW_REVIEW", label: "리뷰", icon: GitPullRequest },
  { value: "PR_MERGED", label: "머지", icon: GitMerge },
]

const readOptions: { value: NotificationFilterRead; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "unread", label: "읽지 않음" },
  { value: "read", label: "읽음" },
]

interface NotificationFilterProps {
  typeFilter: NotificationFilterType
  readFilter: NotificationFilterRead
  onTypeChange: (type: NotificationFilterType) => void
  onReadChange: (read: NotificationFilterRead) => void
}

export default function NotificationFilter({
  typeFilter,
  readFilter,
  onTypeChange,
  onReadChange,
}: NotificationFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex gap-1 flex-wrap">
        {typeOptions.map((opt) => {
          const Icon = opt.icon
          const isActive = typeFilter === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onTypeChange(opt.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {opt.value !== "ALL" && <Icon className="w-3 h-3" />}
              {opt.label}
            </button>
          )
        })}
      </div>
      <div className="flex gap-1">
        {readOptions.map((opt) => {
          const isActive = readFilter === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onReadChange(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
