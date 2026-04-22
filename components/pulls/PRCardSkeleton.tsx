import { Skeleton } from "@/components/ui/skeleton";
import { surfaceStyles } from "@/lib/styles";
import { cn } from "@/lib/utils";

export default function PRCardSkeleton() {
  return (
    <div className={cn(surfaceStyles.card, "space-y-3")}>
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
