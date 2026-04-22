import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { surfaceStyles } from "@/lib/styles";
import PRStatusFilter from "./PRStatusFilter";

function PRStatusFilterFallback() {
  return (
    <div className="flex items-center gap-2 p-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-16 rounded-[14px]" />
      ))}
    </div>
  );
}

export default function PRFilterBar() {
  return (
    <div className={`${surfaceStyles.toolbar} flex flex-col items-stretch justify-between gap-4 md:flex-row md:items-center`}>
      <Suspense fallback={<PRStatusFilterFallback />}>
        <PRStatusFilter />
      </Suspense>
    </div>
  );
}
