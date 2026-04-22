"use client"

import { Github, RefreshCw } from "lucide-react"
import { signIn } from "next-auth/react"
import { controlStyles, surfaceStyles, textStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"

interface GitHubConnectionSectionProps {
  isConnected: boolean
  githubId: number | null
  scope: string | null
}

const SCOPE_LABELS: Record<string, string> = {
  repo: "저장소 읽기/쓰기",
  "admin:repo_hook": "웹훅 관리",
  "read:user": "프로필 읽기",
  "user:email": "이메일 읽기",
}

export default function GitHubConnectionSection({ isConnected, githubId, scope }: GitHubConnectionSectionProps) {
  const scopes = scope ? scope.split(/[,\s]+/).filter(Boolean) : []

  const handleReconnect = () => {
    signIn("github", { callbackUrl: "/settings" })
  }

  return (
    <section className={cn(surfaceStyles.panel, surfaceStyles.panelPadding)}>
      <h2 className={cn(textStyles.sectionTitle, "mb-4")}>GitHub 연결</h2>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
            <Github className="w-5 h-5 text-white" />
          </div>
          <div>
            {isConnected ? (
              <>
                <p className="text-sm font-medium text-slate-800">연결됨</p>
                {githubId && <p className="text-xs text-slate-500">GitHub ID: {githubId}</p>}
              </>
            ) : (
              <p className="text-sm text-slate-500">GitHub 계정이 연결되어 있지 않습니다.</p>
            )}
          </div>
        </div>
        <button
          onClick={handleReconnect}
          className={cn("flex h-9 flex-shrink-0 items-center gap-1.5 px-3 text-sm", controlStyles.secondaryAction)}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          재연결
        </button>
      </div>

      {scopes.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-slate-500 mb-2">부여된 권한</p>
          <div className="flex flex-wrap gap-1.5">
            {scopes.map((s) => (
              <span
                key={s}
                className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full"
              >
                {SCOPE_LABELS[s] ?? s}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
