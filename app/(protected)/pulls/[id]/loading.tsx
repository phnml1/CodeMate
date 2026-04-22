import { Skeleton } from "@/components/ui/skeleton"
import { layoutStyles } from "@/lib/styles"

export default function PRDetailLoading() {
  return (
    <div className={layoutStyles.detailFrame}>
      {/* Sidebar */}
      <div className="w-72 shrink-0 space-y-3 rounded-l-md border-r border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
        <Skeleton className="h-4 w-24" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-lg" />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-6 space-y-4 overflow-hidden">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    </div>
  )
}
