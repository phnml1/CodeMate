import Link from "next/link"
import { Search } from "lucide-react"
import type { ReviewHistoryFilters as Filters } from "@/lib/reviews/history"
import type { ConnectedRepository } from "@/types/repos"

interface ReviewHistoryFiltersProps {
  filters: Filters
  repositories: ConnectedRepository[]
}

export default function ReviewHistoryFilters({
  filters,
  repositories,
}: ReviewHistoryFiltersProps) {
  const hasFilters = Boolean(
    filters.query || filters.repoId || filters.status !== "ALL"
  )

  return (
    <form
      action="/reviews"
      method="get"
      className="grid gap-2 rounded-md border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:grid-cols-[minmax(220px,1fr)_180px_160px_auto]"
    >
      <label className="relative">
        <span className="sr-only">PR 제목 또는 번호 검색</span>
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          name="q"
          defaultValue={filters.query}
          placeholder="PR 제목 또는 번호 검색"
          className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-blue-950"
        />
      </label>

      <label>
        <span className="sr-only">저장소</span>
        <select
          name="repoId"
          defaultValue={filters.repoId ?? ""}
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="">전체 저장소</option>
          {repositories.map((repository) => (
            <option key={repository.id} value={repository.id}>
              {repository.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="sr-only">리뷰 상태</span>
        <select
          name="status"
          defaultValue={filters.status}
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="ALL">전체 상태</option>
          <option value="PENDING">대기 중</option>
          <option value="IN_PROGRESS">진행 중</option>
          <option value="COMPLETED">완료</option>
          <option value="FAILED">실패</option>
        </select>
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          className="h-10 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"
        >
          적용
        </button>
        {hasFilters ? (
          <Link
            href="/reviews"
            className="inline-flex h-10 items-center rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            초기화
          </Link>
        ) : null}
      </div>
    </form>
  )
}
