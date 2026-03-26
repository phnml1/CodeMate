"use client";

import { ChevronLeft, MessageSquare } from "lucide-react";
import FileIcon from "./FileIcon";
import { PR_FILE_STATUS_BADGE } from "@/constants/pulls";
import type { PRFile } from "@/types/pulls";

interface PRFileListProps {
  files: PRFile[];
  selectedFile?: string;
  onSelectFile?: (filename: string) => void;
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  commentCountsByFile?: Record<string, number>;
}


export default function PRFileList({ files, selectedFile, onSelectFile, collapsed = false, onCollapse, commentCountsByFile = {} }: PRFileListProps) {
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
          const badge = PR_FILE_STATUS_BADGE[file.status];
          const isSelected = file.filename === selectedFile;
          const commentCount = commentCountsByFile[file.filename] ?? 0;
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
              <div className="flex items-center gap-2 shrink-0">
                {commentCount > 0 && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                    <MessageSquare size={9} />
                    {commentCount}
                  </span>
                )}
                <div className="flex items-center gap-1 text-[10px] font-black opacity-60">
                  <span className="text-emerald-600">+{file.additions}</span>
                  <span className="text-rose-500">-{file.deletions}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
