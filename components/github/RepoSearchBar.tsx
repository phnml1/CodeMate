"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { surfaceStyles } from "@/lib/styles"

interface RepoSearchBarProps {
  value: string
  onChange: (value: string) => void
}

export default function RepoSearchBar({ value, onChange }: RepoSearchBarProps) {
  return (
    <div className="max-w-2xl">
      <div className={surfaceStyles.toolbar}>
        <div className="relative flex-1">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none"
            aria-hidden
          />
          <Input
            type="text"
            placeholder="레포지토리 이름으로 검색..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-11 w-full rounded-xl border-none bg-slate-50 py-3 pl-12 pr-4 text-sm font-medium shadow-none placeholder:font-medium placeholder:text-slate-400 focus-visible:ring-blue-700/10"
          />
        </div>
      </div>
    </div>
  )
}
