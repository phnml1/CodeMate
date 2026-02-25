import { Skeleton } from "@/components/ui/skeleton";

export default function PRCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-[24px] p-6 md:p-8 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-4 w-8" />
      </div>
      <Skeleton className="h-6 w-3/4" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}
