import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer } from "@/components/layout/PageContainer"
import { layoutStyles, surfaceStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"

export default function DashboardLoading() {
  return (
    <PageContainer size="wide">
      {/* Stat Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${layoutStyles.gridGap}`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={cn(surfaceStyles.panel, surfaceStyles.panelPadding, "space-y-4")}>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 ${layoutStyles.gridGap}`}>
        <div className={cn(surfaceStyles.panel, surfaceStyles.panelPadding, "space-y-4")}>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
        <div className={cn(surfaceStyles.panel, surfaceStyles.panelPadding, "space-y-4")}>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      </div>

      {/* Recent PRs */}
      <div className={cn(surfaceStyles.panel, "overflow-hidden")}>
        <div className="border-b border-slate-200 p-4 sm:p-6 dark:border-slate-800">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <Skeleton className="h-4 w-4 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  )
}
