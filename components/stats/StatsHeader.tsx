import { textStyles } from "@/lib/styles"
import type { StatsRange } from "@/lib/stats"

const RANGE_OPTIONS: { label: string; value: StatsRange }[] = [
  { label: "7일", value: "7d" },
  { label: "30일", value: "30d" },
  { label: "90일", value: "90d" },
  { label: "전체", value: "all" },
]

interface StatsHeaderProps {
  range: StatsRange
  onRangeChange: (range: StatsRange) => void
  repoId: string
  onRepoIdChange: (repoId: string) => void
  repos: { id: string; name: string; fullName: string }[]
}

export default function StatsHeader({
  range,
  onRangeChange,
  repoId,
  onRepoIdChange,
  repos,
}: StatsHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className={textStyles.pageTitle}>통계</h1>
        <p className={textStyles.pageSubtitle}>
          프로젝트의 코드 품질과 활동을 한눈에 확인하세요
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-full p-1 shadow-sm">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onRangeChange(opt.value)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                range === opt.value
                  ? "bg-blue-500 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {repos.length > 0 && (
          <select
            value={repoId}
            onChange={(e) => onRepoIdChange(e.target.value)}
            className="h-9 px-3 py-1 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 cursor-pointer"
          >
            <option value="">전체 저장소</option>
            {repos.map((repo) => (
              <option key={repo.id} value={repo.id}>
                {repo.fullName}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
