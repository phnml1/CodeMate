import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
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
    <div className="bg-white border border-slate-200 p-2 rounded-[24px] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-sm">
      <Suspense fallback={<PRStatusFilterFallback />}>
        <PRStatusFilter />
      </Suspense>
    </div>
  );
}
