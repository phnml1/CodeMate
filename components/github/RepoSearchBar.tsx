"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface RepoSearchBarProps {
  value: string
  onChange: (value: string) => void
}

export default function RepoSearchBar({ value, onChange }: RepoSearchBarProps) {
  return (
    <div className="max-w-2xl">
      <div className="bg-white border border-slate-200 p-2 rounded-[24px] shadow-sm">
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
            className="w-full pl-12 pr-4 py-3 h-auto bg-slate-50 border-none rounded-[18px] text-sm placeholder:text-slate-400 placeholder:font-medium font-medium shadow-none focus-visible:ring-blue-700/10"
          />
        </div>
      </div>
    </div>
  )
}
