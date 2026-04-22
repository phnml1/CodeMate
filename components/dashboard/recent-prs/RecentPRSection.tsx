import { type DashboardRecentPR } from "@/lib/dashboard"
import RecentPRTable from "./RecentPRTable"
import { surfaceStyles, textStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"

export default function RecentPRSection({ prs }: { prs: DashboardRecentPR[] }) {
  return (
    <div className={cn(surfaceStyles.panel, "overflow-hidden")}>
      <div className="border-b border-slate-200 p-4 sm:p-6">
        <h3 className={textStyles.sectionTitle}>최근 Pull Requests</h3>
      </div>
      <RecentPRTable prs={prs} />
    </div>
  )
}
