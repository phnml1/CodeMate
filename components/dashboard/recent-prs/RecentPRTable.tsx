import { cn } from "@/lib/utils"
import { textStyles } from "@/lib/styles"
import { type DashboardRecentPR } from "@/lib/dashboard"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const STATUS_LABEL: Record<DashboardRecentPR["status"], string> = {
  OPEN: "오픈",
  MERGED: "병합됨",
  CLOSED: "닫힘",
  DRAFT: "드래프트",
}

const STATUS_STYLE: Record<DashboardRecentPR["status"], string> = {
  OPEN: "bg-blue-100 text-blue-700",
  MERGED: "bg-green-100 text-green-700",
  CLOSED: "bg-slate-100 text-slate-600",
  DRAFT: "bg-slate-100 text-slate-500",
}

export default function RecentPRTable({ prs }: { prs: DashboardRecentPR[] }) {
  if (prs.length === 0) {
    return (
      <div className="px-4 sm:px-8 py-12 text-center text-slate-400 text-sm">
        연결된 레포지토리에 Pull Request가 없습니다.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50 border-b border-slate-200 hover:bg-slate-50">
          <TableHead className={cn(textStyles.tableHeader, "px-4 sm:px-6 md:px-8 py-3 sm:py-4")}>
            PR 번호
          </TableHead>
          <TableHead className={cn(textStyles.tableHeader, "px-4 sm:px-6 md:px-8 py-3 sm:py-4")}>
            제목
          </TableHead>
          <TableHead className={cn(textStyles.tableHeader, "px-4 sm:px-6 md:px-8 py-3 sm:py-4 hidden md:table-cell")}>
            레포지토리
          </TableHead>
          <TableHead className={cn(textStyles.tableHeader, "px-4 sm:px-6 md:px-8 py-3 sm:py-4")}>
            점수
          </TableHead>
          <TableHead className={cn(textStyles.tableHeader, "px-4 sm:px-6 md:px-8 py-3 sm:py-4 hidden sm:table-cell")}>
            상태
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="divide-y divide-slate-100">
        {prs.map((pr, index) => (
          <TableRow
            key={pr.id}
            className={`hover:bg-slate-50 transition-colors cursor-pointer ${
              index % 2 === 1 ? "bg-slate-50/30" : "bg-white"
            }`}
          >
            <TableCell className="px-4 sm:px-6 md:px-8 py-4 sm:py-5">
              <span className="text-xs sm:text-sm font-mono font-bold text-blue-600">
                #{pr.number}
              </span>
            </TableCell>
            <TableCell className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 whitespace-normal">
              <div className="flex flex-col gap-1">
                <span className="text-xs sm:text-sm text-slate-900 font-semibold">
                  {pr.title}
                </span>
                <span className="text-xs text-slate-500 md:hidden">{pr.repoName}</span>
              </div>
            </TableCell>
            <TableCell className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 hidden md:table-cell">
              <span className="text-sm text-slate-600 font-medium">{pr.repoName}</span>
            </TableCell>
            <TableCell className="px-4 sm:px-6 md:px-8 py-4 sm:py-5">
              {pr.score !== null ? (
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  {pr.score}점
                </span>
              ) : (
                <span className="text-xs sm:text-sm text-slate-400">-</span>
              )}
            </TableCell>
            <TableCell className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 hidden sm:table-cell">
              <span
                className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold ${STATUS_STYLE[pr.status]}`}
              >
                {STATUS_LABEL[pr.status]}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
