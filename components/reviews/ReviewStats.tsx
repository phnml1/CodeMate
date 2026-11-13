import { Bot, Bug, LoaderCircle, Star } from "lucide-react"
import type { ReviewHistoryStats } from "@/lib/reviews/history"
import { surfaceStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"

export default function ReviewStats({ stats }: { stats: ReviewHistoryStats }) {
  const items = [
    { label: "완료된 리뷰", value: `${stats.completedCount}건`, icon: Bot },
    { label: "발견한 이슈", value: `${stats.issueCount}개`, icon: Bug },
    { label: "평균 품질 점수", value: `${stats.averageQualityScore}점`, icon: Star },
    { label: "진행 중", value: `${stats.activeCount}건`, icon: LoaderCircle },
  ]

  return (
    <section aria-label="AI 리뷰 통계" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className={cn(surfaceStyles.card, "flex-row items-center gap-4") }>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
            <item.icon size={18} />
          </span>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">{item.value}</p>
          </div>
        </div>
      ))}
    </section>
  )
}
