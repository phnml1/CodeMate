import { Skeleton } from "@/components/ui/skeleton"
import { layoutStyles, surfaceStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"

export function StatCardsSkeleton() {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${layoutStyles.gridGap}`}>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className={cn(surfaceStyles.panel, surfaceStyles.panelPadding, "space-y-4")}>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-5 ${layoutStyles.gridGap}`}>
      <div className={cn(surfaceStyles.panel, surfaceStyles.panelPadding, "space-y-4 lg:col-span-3")}>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-56 w-full" />
      </div>
      <div className={cn(surfaceStyles.panel, surfaceStyles.panelPadding, "space-y-4 lg:col-span-2")}>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-56 w-full" />
      </div>
    </div>
  )
}

export function RecentPRSkeleton() {
  return (
    <div className={cn(surfaceStyles.panel, "overflow-hidden")}>
      <div className="border-b border-slate-200 p-4 sm:p-6 dark:border-slate-800">
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="space-y-4 p-4 sm:p-6">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
    </div>
  )
}
