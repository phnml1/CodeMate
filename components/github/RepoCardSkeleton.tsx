import { Skeleton } from "@/components/ui/skeleton"

export default function RepoCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-[24px] p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="h-9 w-20 rounded-xl self-end sm:self-center shrink-0" />
      </div>
    </div>
  )
}
