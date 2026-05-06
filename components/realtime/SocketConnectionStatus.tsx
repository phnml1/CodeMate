"use client"

import { AlertCircle, Loader2, Wifi, WifiOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useSocketState } from "@/hooks/useSocket"
import { cn } from "@/lib/utils"

interface SocketConnectionBadgeProps {
  className?: string
}

interface SocketConnectionNoticeProps {
  className?: string
}

function getSocketStatusPresentation(params: {
  realtimeEnabled: boolean
  connectionStatus: ReturnType<typeof useSocketState>["connectionStatus"]
  fallbackActive: boolean
  connectionError: string | null
}) {
  const { realtimeEnabled, connectionStatus, fallbackActive, connectionError } = params

  if (!realtimeEnabled) {
    return {
      badgeLabel: "폴링",
      badgeClassName:
        "border-slate-200 bg-white/80 text-slate-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300",
      BadgeIcon: WifiOff,
      notice: null,
    }
  }

  if (connectionStatus === "connected") {
    return {
      badgeLabel: fallbackActive ? "복구 중" : "실시간",
      badgeClassName:
        "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:bg-emerald-500/15 dark:text-emerald-300",
      BadgeIcon: Wifi,
      notice: null,
    }
  }

  if (fallbackActive) {
    return {
      badgeLabel: "Polling Fallback",
      badgeClassName:
        "bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 dark:bg-amber-500/15 dark:text-amber-300",
      BadgeIcon: WifiOff,
      notice: connectionError
        ? `실시간 동기화 서버에 연결할 수 없어 React Query 폴링 폴백으로 전환했습니다. ${connectionError}`
        : "실시간 동기화 서버에 연결할 수 없어 React Query 폴링 폴백으로 전환했습니다.",
    }
  }

  if (connectionStatus === "connecting" || connectionStatus === "reconnecting") {
    return {
      badgeLabel: connectionStatus === "connecting" ? "연결 중" : "재연결 중",
      badgeClassName:
        "bg-blue-500/10 text-blue-700 hover:bg-blue-500/10 dark:bg-blue-500/15 dark:text-blue-300",
      BadgeIcon: Loader2,
      notice:
        connectionStatus === "reconnecting"
          ? "실시간 동기화 연결을 다시 시도하고 있습니다."
          : null,
    }
  }

  if (connectionStatus === "error") {
    return {
      badgeLabel: "소켓 오류",
      badgeClassName:
        "bg-rose-500/10 text-rose-700 hover:bg-rose-500/10 dark:bg-rose-500/15 dark:text-rose-300",
      BadgeIcon: AlertCircle,
      notice: connectionError
        ? `소켓 연결에 실패했습니다. ${connectionError}`
        : "소켓 연결에 실패했습니다.",
    }
  }

  return {
    badgeLabel: "오프라인",
    badgeClassName:
      "bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 dark:bg-amber-500/15 dark:text-amber-300",
    BadgeIcon: WifiOff,
    notice: "실시간 동기화 연결이 끊어져 재연결을 대기 중입니다.",
  }
}

export function SocketConnectionBadge({
  className,
}: SocketConnectionBadgeProps) {
  const { realtimeEnabled, connectionStatus, fallbackActive, connectionError } =
    useSocketState()

  const presentation = getSocketStatusPresentation({
    realtimeEnabled,
    connectionStatus,
    fallbackActive,
    connectionError,
  })

  return (
    <Badge className={cn("gap-1", presentation.badgeClassName, className)}>
      <presentation.BadgeIcon
        size={12}
        className={presentation.BadgeIcon === Loader2 ? "animate-spin" : undefined}
      />
      {presentation.badgeLabel}
    </Badge>
  )
}

export function SocketConnectionNotice({
  className,
}: SocketConnectionNoticeProps) {
  const { realtimeEnabled, connectionStatus, fallbackActive, connectionError } =
    useSocketState()

  const presentation = getSocketStatusPresentation({
    realtimeEnabled,
    connectionStatus,
    fallbackActive,
    connectionError,
  })

  if (!presentation.notice) return null

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300",
        className
      )}
    >
      <AlertCircle size={14} className="shrink-0" />
      <span>{presentation.notice}</span>
    </div>
  )
}
