"use client"

import { User } from "lucide-react"

interface ConnectedRepo {
  id: string
  name: string
  fullName: string
}

interface CommentFilterProps {
  repos: ConnectedRepo[]
  selectedRepoId: string | undefined
  myOnly: boolean
  onRepoChange: (repoId: string | undefined) => void
  onMyOnlyChange: (myOnly: boolean) => void
}

export default function CommentFilter({
  repos,
  selectedRepoId,
  myOnly,
  onRepoChange,
  onMyOnlyChange,
}: CommentFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* 저장소 필터 */}
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => onRepoChange(undefined)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            !selectedRepoId
              ? "bg-blue-100 text-blue-700"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          전체 저장소
        </button>
        {repos.map((repo) => (
          <button
            key={repo.id}
            onClick={() => onRepoChange(repo.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedRepoId === repo.id
                ? "bg-blue-100 text-blue-700"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {repo.name}
          </button>
        ))}
      </div>

      {/* 내 댓글만 토글 */}
      <button
        onClick={() => onMyOnlyChange(!myOnly)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors self-start ${
          myOnly
            ? "bg-blue-100 text-blue-700"
            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
        }`}
      >
        <User className="w-3 h-3" />
        내 댓글만
      </button>
    </div>
  )
}
