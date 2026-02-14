import { ArrowUp, ArrowDown, Minus } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type PRStatus = "오픈" | "병합됨" | "닫힘"
type ScoreTrend = "up" | "down" | "neutral"

interface PRItem {
  number: number
  title: string
  author: string
  score: number
  trend: ScoreTrend
  status: PRStatus
}

const prData: PRItem[] = [
  { number: 42, title: "feat: Add AI review", author: "김개발", score: 87, trend: "up", status: "오픈" },
  { number: 41, title: "fix: 메모리 누수 해결", author: "이코드", score: 92, trend: "up", status: "병합됨" },
  { number: 40, title: "refactor: API 리팩토링", author: "박리뷰", score: 78, trend: "down", status: "오픈" },
  { number: 39, title: "docs: README 업데이트", author: "최문서", score: 85, trend: "neutral", status: "병합됨" },
  { number: 38, title: "test: 단위 테스트 추가", author: "정테스트", score: 90, trend: "up", status: "닫힘" },
]

const statusStyles: Record<PRStatus, string> = {
  "오픈": "bg-blue-100 text-blue-700",
  "병합됨": "bg-green-100 text-green-700",
  "닫힘": "bg-slate-100 text-slate-600",
}

function TrendIcon({ trend }: { trend: ScoreTrend }) {
  if (trend === "up") return <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
  if (trend === "down") return <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
  return <Minus className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
}

export default function RecentPRTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50 border-b border-slate-200 hover:bg-slate-50">
          <TableHead className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">
            PR 번호
          </TableHead>
          <TableHead className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">
            제목
          </TableHead>
          <TableHead className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-xs font-bold text-slate-700 uppercase tracking-wider hidden md:table-cell">
            작성자
          </TableHead>
          <TableHead className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">
            점수
          </TableHead>
          <TableHead className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-xs font-bold text-slate-700 uppercase tracking-wider hidden sm:table-cell">
            상태
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="divide-y divide-slate-100">
        {prData.map((pr, index) => (
          <TableRow
            key={pr.number}
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
                <span className="text-xs sm:text-sm text-slate-900 font-semibold">{pr.title}</span>
                <span className="text-xs text-slate-500 md:hidden">{pr.author}</span>
              </div>
            </TableCell>
            <TableCell className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 hidden md:table-cell">
              <span className="text-sm text-slate-600 font-medium">{pr.author}</span>
            </TableCell>
            <TableCell className="px-4 sm:px-6 md:px-8 py-4 sm:py-5">
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-900">{pr.score}점</span>
                <TrendIcon trend={pr.trend} />
              </div>
            </TableCell>
            <TableCell className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 hidden sm:table-cell">
              <span className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold ${statusStyles[pr.status]}`}>
                {pr.status}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
