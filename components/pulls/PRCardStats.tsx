import { Separator } from "@/components/ui/separator";

interface PRCardStatsProps {
  additions: number;
  deletions: number;
}

export default function PRCardStats({ additions, deletions }: PRCardStatsProps) {
  return (
    <div className="flex items-center gap-4 sm:gap-6">
      <div className="flex flex-col items-end">
        <span className="text-emerald-600 font-black text-base sm:text-lg">
          +{additions}
        </span>
        <span className="text-[8px] sm:text-[9px] text-slate-300 font-bold uppercase tracking-tighter">
          Additions
        </span>
      </div>

      <Separator orientation="vertical" className="h-6 sm:h-8 bg-slate-100" />

      <div className="flex flex-col items-end">
        <span className="text-rose-500 font-black text-base sm:text-lg">
          -{deletions}
        </span>
        <span className="text-[8px] sm:text-[9px] text-slate-300 font-bold uppercase tracking-tighter">
          Deletions
        </span>
      </div>
    </div>
  );
}
