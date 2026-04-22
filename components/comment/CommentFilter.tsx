"use client"

import { User } from "lucide-react"
import { controlStyles, surfaceStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"

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
    <div className={cn(surfaceStyles.toolbar, "flex flex-col gap-3 sm:flex-row")}>
      {/* 저장소 필터 */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => onRepoChange(undefined)}
          className={cn(controlStyles.filterButton,
            !selectedRepoId
              ? "bg-blue-100 text-blue-700"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          )}
        >
          전체 저장소
        </button>
        {repos.map((repo) => (
          <button
            key={repo.id}
            onClick={() => onRepoChange(repo.id)}
            className={cn(controlStyles.filterButton,
              selectedRepoId === repo.id
                ? "bg-blue-100 text-blue-700"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            )}
          >
            {repo.name}
          </button>
        ))}
      </div>

      {/* 내 댓글만 토글 */}
      <button
        onClick={() => onMyOnlyChange(!myOnly)}
        className={cn(controlStyles.filterButton, "self-start",
          myOnly
            ? "bg-blue-100 text-blue-700"
            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
        )}
      >
        <User className="w-3 h-3" />
        내 댓글만
      </button>
    </div>
  )
}
