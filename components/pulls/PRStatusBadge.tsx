import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PRStatus } from "@/types/pulls";

const STATUS_CONFIG: Record<
  PRStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  OPEN: {
    label: "Open",
    badgeClass: "bg-emerald-50 border border-emerald-100 text-emerald-600",
    dotClass: "bg-emerald-500 animate-pulse",
  },
  MERGED: {
    label: "Merged",
    badgeClass: "bg-purple-50 border border-purple-100 text-purple-600",
    dotClass: "bg-purple-500 animate-pulse",
  },
  CLOSED: {
    label: "Closed",
    badgeClass: "bg-rose-50 border border-rose-100 text-rose-600",
    dotClass: "bg-rose-500 animate-pulse",
  },
  DRAFT: {
    label: "Draft",
    badgeClass: "bg-slate-50 border border-slate-200 text-slate-500",
    dotClass: "bg-slate-400",
  },
};

interface PRStatusBadgeProps {
  status: PRStatus;
}

export default function PRStatusBadge({ status }: PRStatusBadgeProps) {
  const { label, badgeClass, dotClass } = STATUS_CONFIG[status];

  return (
    <Badge
      className={cn(
        "gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider",
        badgeClass
      )}
    >
      <span
        className={cn("w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full shrink-0", dotClass)}
      />
      {label}
    </Badge>
  );
}
