import { ChevronDown, ChevronRight, MessageSquare } from "lucide-react";
import FileIcon from "../FileIcon";
import type { PRFile } from "@/types/pulls";

interface DiffHeaderProps {
  file: PRFile;
  collapsed: boolean;
  onToggle: () => void;
  isActive?: boolean;
  inlineCommentCount?: number;
}

export default function DiffHeader({ file, collapsed, onToggle, isActive = false, inlineCommentCount = 0 }: DiffHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-controls={`diff-body-${file.filename}`}
      className={`w-full px-5 py-3 border-b flex items-center justify-between cursor-pointer transition-colors ${
        isActive
          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30"
          : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-slate-400">
          {collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
        </span>
        <div className="flex items-center gap-2">
          <FileIcon filename={file.filename} size={16} />
          <span className={`text-sm font-mono font-bold break-all ${
            isActive ? "text-blue-700 dark:text-blue-400" : "text-slate-800 dark:text-slate-200"
          }`}>
            {file.filename}
          </span>
          {inlineCommentCount > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <MessageSquare size={10} />
              {inlineCommentCount}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs font-black">
        <span className="text-emerald-600">+{file.additions}</span>
        <span className="text-rose-500">-{file.deletions}</span>
      </div>
    </button>
  );
}
