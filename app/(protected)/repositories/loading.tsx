import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer } from "@/components/layout/PageContainer"
import { layoutStyles, surfaceStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"

export default function RepositoriesLoading() {
  return (
    <PageContainer>
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Search */}
      <Skeleton className="h-10 w-full rounded-xl" />

      {/* Repo List */}
      <div className={layoutStyles.listStack}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cn(surfaceStyles.card, "flex items-center justify-between gap-4")}>
            <div className="flex items-center gap-4 flex-1">
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
            <Skeleton className="h-9 w-20 rounded-xl shrink-0" />
          </div>
        ))}
      </div>
    </PageContainer>
  )
}
