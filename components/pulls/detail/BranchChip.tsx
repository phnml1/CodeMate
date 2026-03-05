import { GitBranch } from "lucide-react";

interface BranchChipProps {
  name: string;
}

export default function BranchChip({ name }: BranchChipProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md font-mono text-[10px] md:text-xs font-bold text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700">
      <GitBranch size={12} />
      {name}
    </div>
  );
}
