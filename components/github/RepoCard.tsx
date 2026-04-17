"use client"

import { useState } from "react"
import {
  AlertCircle,
  Check,
  FolderGit2,
  Github,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSyncRepository } from "@/hooks/useSyncRepository"
import { controlStyles, surfaceStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "bg-blue-500",
  JavaScript: "bg-yellow-400",
  Python: "bg-green-500",
  Rust: "bg-orange-500",
  Go: "bg-cyan-500",
  Java: "bg-red-500",
  "C++": "bg-pink-500",
  "C#": "bg-purple-500",
}

interface RepoCardProps {
  githubId: number
  name: string
  fullName: string
  language: string | null
  isConnected: boolean
  repositoryId?: string
  onConnect?: () => void
  onDisconnect?: () => void
  isConnecting?: boolean
  connectError?: string | null
}

export default function RepoCard({
  name,
  fullName,
  language,
  isConnected,
  repositoryId,
  onConnect,
  onDisconnect,
  isConnecting = false,
  connectError = null,
}: RepoCardProps) {
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const { mutate: sync, isPending: isSyncing } = useSyncRepository()
  const dotColor = language ? (LANGUAGE_COLORS[language] ?? "bg-slate-400") : null

  return (
    <div className={cn("group relative", surfaceStyles.interactiveCard)}>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 shrink-0 rounded-2xl border border-slate-100 bg-slate-50 text-slate-400 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600 flex items-center justify-center">
            <FolderGit2 size={22} aria-hidden />
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">{name}</h3>
              {language && dotColor && (
                <Badge
                  variant="outline"
                  className="gap-1.5 rounded-full border-slate-100 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500"
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
                  {language}
                </Badge>
              )}
            </div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-slate-400">
              <Github size={12} aria-hidden />
              {fullName}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 self-end sm:self-center">
          {isConnected ? (
            <>
              <Badge className="gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600">
                <Check size={12} aria-hidden />
                연동됨
              </Badge>
              {syncMessage && (
                <span className="text-xs font-medium text-slate-500">{syncMessage}</span>
              )}
              <Button
                variant="ghost"
                size="icon"
                disabled={isSyncing || !repositoryId}
                onClick={() => {
                  if (!repositoryId) return

                  sync(repositoryId, {
                    onSuccess: ({ updated, total }) => {
                      setSyncMessage(
                        total === 0 ? "보정할 PR 없음" : `${updated}/${total}건 보정 완료`
                      )
                      setTimeout(() => setSyncMessage(null), 3000)
                    },
                    onError: () => {
                      setSyncMessage("동기화 실패")
                      setTimeout(() => setSyncMessage(null), 3000)
                    },
                  })
                }}
                title="코드 변경량 동기화"
                className={cn(
                  controlStyles.iconButton,
                  "text-slate-400 hover:border-blue-100 hover:bg-blue-50 hover:text-blue-500 disabled:opacity-40"
                )}
              >
                <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDisconnect}
                title="연동 해제"
                className={cn(
                  controlStyles.iconButton,
                  "text-slate-400 hover:border-rose-100 hover:bg-rose-50 hover:text-rose-500"
                )}
              >
                <Trash2 size={18} aria-hidden />
              </Button>
            </>
          ) : (
            <Button
              onClick={onConnect}
              size="sm"
              disabled={isConnecting}
              className={cn("h-9 gap-1.5 px-4", controlStyles.primaryAction)}
            >
              {isConnecting ? (
                <>
                  <Loader2 size={14} className="animate-spin" aria-hidden />
                  연동 중...
                </>
              ) : (
                <>
                  <Plus size={14} aria-hidden />
                  연동
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {connectError && !isConnected && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
          <AlertCircle size={13} aria-hidden />
          {connectError}
        </div>
      )}

      <div className="absolute left-0 top-1/2 h-0 w-1 -translate-y-1/2 rounded-r-full bg-blue-600 transition-all duration-300 group-hover:h-12" />
    </div>
  )
}
