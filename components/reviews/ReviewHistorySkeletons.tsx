import { Skeleton } from "@/components/ui/skeleton"

export function ReviewStatsSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-24 rounded-md" />
      ))}
    </div>
  )
}

export function ReviewFiltersSkeleton() {
  return <Skeleton aria-hidden="true" className="h-14 rounded-md" />
}

export function ReviewHistoryListSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-5 w-14" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-md" />
        ))}
      </div>
    </div>
  )
}
