import { FolderGit2, Github, Check, Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

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
}

export default function RepoCard({
  name,
  fullName,
  language,
  isConnected,
  onConnect,
  onDisconnect,
}: RepoCardProps) {
  const dotColor = language ? (LANGUAGE_COLORS[language] ?? "bg-slate-400") : null

  return (
    <div className="group relative bg-white border border-slate-200 rounded-[24px] p-6 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">

        {/* 왼쪽: 아이콘 + 정보 */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors border border-slate-100 shrink-0">
            <FolderGit2 size={22} aria-hidden />
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-slate-900">{name}</h3>
              {language && dotColor && (
                <Badge
                  variant="outline"
                  className="gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 border-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wide"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                  {language}
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-400 font-medium flex items-center gap-1.5">
              <Github size={12} aria-hidden />
              {fullName}
            </p>
          </div>
        </div>

        {/* 오른쪽: 상태 + 액션 */}
        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
          {isConnected ? (
            <>
              <Badge className="gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold">
                <Check size={12} aria-hidden />
                연동됨
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDisconnect}
                title="연동 해제"
                className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100 h-auto w-auto"
              >
                <Trash2 size={18} aria-hidden />
              </Button>
            </>
          ) : (
            <Button
              onClick={onConnect}
              size="sm"
              className="gap-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold shadow-lg shadow-blue-700/20 h-auto px-4 py-2"
            >
              <Plus size={14} aria-hidden />
              연동
            </Button>
          )}
        </div>
      </div>

      {/* 호버 시 왼쪽 파란 인디케이터 */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 group-hover:h-12 bg-blue-600 rounded-r-full transition-all duration-300" />
    </div>
  )
}
