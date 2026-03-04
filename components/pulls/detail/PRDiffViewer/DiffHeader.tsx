import { ChevronDown, ChevronRight } from "lucide-react";
import FileIcon from "../FileIcon";
import type { PRFile } from "@/types/pulls";

interface DiffHeaderProps {
  file: PRFile;
  collapsed: boolean;
  onToggle: () => void;
}

export default function DiffHeader({ file, collapsed, onToggle }: DiffHeaderProps) {
  return (
    <div
      className="bg-slate-100 dark:bg-slate-800 px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        <span className="text-slate-400">
          {collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
        </span>
        <div className="flex items-center gap-2">
          <FileIcon filename={file.filename} size={16} />
          <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200 break-all">
            {file.filename}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs font-black">
        <span className="text-emerald-600">+{file.additions}</span>
        <span className="text-rose-500">-{file.deletions}</span>
      </div>
    </div>
  );
}
