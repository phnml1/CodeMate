"use client";

import { ChevronLeft } from "lucide-react";
import FileIcon from "./FileIcon";
import type { PRFile, PRFileStatus } from "@/types/pulls";

interface PRFileListProps {
  files: PRFile[];
  selectedFile?: string;
  onSelectFile?: (filename: string) => void;
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

const STATUS_BADGE: Record<PRFileStatus, { label: string; className: string }> = {
  added:     { label: "A", className: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30" },
  modified:  { label: "M", className: "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30" },
  removed:   { label: "D", className: "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30" },
  renamed:   { label: "R", className: "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30" },
  copied:    { label: "C", className: "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30" },
  changed:   { label: "M", className: "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30" },
  unchanged: { label: "U", className: "bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/30" },
};


export default function PRFileList({ files, selectedFile, onSelectFile, collapsed = false, onCollapse }: PRFileListProps) {
  return (
    <nav
      aria-label="변경된 파일 목록"
      className={`
        shrink-0  flex-col transition-all duration-300 ease-in-out border-r border-slate-200 dark:border-slate-800 overflow-hidden
        hidden md:flex self-stretch relative
 ${collapsed ? "w-0" : "w-72"}`}
    >
      {/* 헤더 */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Files</h2>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {files.length}
            </span>
          </div>
          <button
            onClick={() => onCollapse?.(true)}
            aria-label="파일 목록 닫기"
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-400 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      {/* 파일 목록 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-50 dark:bg-slate-950">
        {files.map((file) => {
          const badge = STATUS_BADGE[file.status];
          const isSelected = file.filename === selectedFile;
          return (
            <button
              key={file.filename}
              onClick={() => onSelectFile?.(file.filename)}
              aria-label={`${file.filename} 파일로 이동`}
              aria-current={isSelected ? "true" : undefined}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left group border-l-2 ${
                isSelected
                  ? "bg-blue-50 dark:bg-blue-900/30 border-blue-500 shadow-sm"
                  : "hover:bg-slate-100 dark:hover:bg-slate-900 border-transparent"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-5 h-5 shrink-0 flex items-center justify-center text-[10px] font-black rounded-md border ${badge.className}`}>
                  {badge.label}
                </span>
                <div className="flex items-center gap-2 min-w-0">
                  <FileIcon filename={file.filename} size={14} />
                  <span className={`text-xs font-bold truncate ${
                    isSelected
                      ? "text-blue-700 dark:text-blue-400"
                      : "text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200"
                  }`}>
                    {file.filename}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black opacity-60 shrink-0">
                <span className="text-emerald-600">+{file.additions}</span>
                <span className="text-rose-500">-{file.deletions}</span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
