import { Skeleton } from "@/components/ui/skeleton"

export default function PRDetailLoading() {
  return (
    <div className="flex h-[calc(100svh-6.5rem)] md:h-[calc(100svh-8.5rem)] lg:h-[calc(100svh-9.5rem)] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[24px] shadow-sm mt-2">
      {/* Sidebar */}
      <div className="w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-l-[24px] p-4 space-y-3">
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
