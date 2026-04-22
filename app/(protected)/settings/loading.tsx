import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer } from "@/components/layout/PageContainer"
import { surfaceStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"

export default function SettingsLoading() {
  return (
    <PageContainer>
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-4 w-52" />
      </div>

      {/* Profile Card */}
      <div className={cn(surfaceStyles.panel, surfaceStyles.panelPadding, "space-y-6")}>
        <Skeleton className="h-5 w-24" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>

      {/* GitHub Section */}
      <div className={cn(surfaceStyles.panel, surfaceStyles.panelPadding, "space-y-4")}>
        <Skeleton className="h-5 w-32" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      {/* AI Review Section */}
      <div className={cn(surfaceStyles.panel, surfaceStyles.panelPadding, "space-y-4")}>
        <Skeleton className="h-5 w-28" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-10 rounded-full" />
          </div>
        ))}
      </div>
    </PageContainer>
  )
}
