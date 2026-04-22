import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer } from "@/components/layout/PageContainer"
import { layoutStyles, surfaceStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"

export default function StatsLoading() {
  return (
    <PageContainer size="wide">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-16 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className={`grid grid-cols-2 lg:grid-cols-4 ${layoutStyles.gridGap}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cn(surfaceStyles.card, "space-y-3")}>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 ${layoutStyles.gridGap}`}>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className={cn(surfaceStyles.panel, surfaceStyles.panelPadding, "space-y-4")}>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className={cn(surfaceStyles.panel, "overflow-hidden")}>
        <div className="border-b border-slate-200 p-4 sm:p-6 dark:border-slate-800">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  )
}
