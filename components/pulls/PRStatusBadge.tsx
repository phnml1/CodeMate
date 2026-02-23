import { PR_STATUS_CONFIG } from "@/constants";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PRStatus } from "@/types/pulls";

interface PRStatusBadgeProps {
  status: PRStatus;
}

export default function PRStatusBadge({ status }: PRStatusBadgeProps) {
  const { label, badgeClass, dotClass } = PR_STATUS_CONFIG[status];

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
