"use client";

import { useEffect } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import PRFileList from "./PRFileList";
import PRDetailHeader from "./PRDetailHeader";
import PRDiffViewer from "./PRDiffViewer";
import FileIcon from "./FileIcon";
import { usePRDetailStore } from "@/stores/prDetailStore";
import type { PRFile, PullRequest } from "@/types/pulls";

interface PRDetailLayoutProps {
  pr: PullRequest;
  files: PRFile[];
}

export default function PRDetailLayout({ pr, files }: PRDetailLayoutProps) {
  const selectedFile = usePRDetailStore((s) => s.selectedFile);
  const sidebarCollapsed = usePRDetailStore((s) => s.sidebarCollapsed);
  const mobileFileOpen = usePRDetailStore((s) => s.mobileFileOpen);
  const selectFile = usePRDetailStore((s) => s.selectFile);
  const setSidebarCollapsed = usePRDetailStore((s) => s.setSidebarCollapsed);
  const setMobileFileOpen = usePRDetailStore((s) => s.setMobileFileOpen);
  const reset = usePRDetailStore((s) => s.reset);

  useEffect(() => {
    reset(files[0]?.filename);
  }, [pr.id]);

  const handleSelectFile = (filename: string) => {
    selectFile(filename);
    requestAnimationFrame(() => {
      document.getElementById(`diff-${filename}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="flex h-[calc(100svh-6.5rem)] md:h-[calc(100svh-8.5rem)] lg:h-[calc(100svh-9.5rem)] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[24px] shadow-sm relative min-w-0 overflow-hidden mt-2">
      <PRFileList
        files={files}
        selectedFile={selectedFile}
        onSelectFile={handleSelectFile}
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
      />
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950 relative overflow-y-auto overflow-x-hidden">
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            aria-label="파일 목록 열기"
            className="absolute left-0 top-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-r-lg shadow-md hidden md:block z-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        )}
        <PRDetailHeader pr={pr} />

        {/* 모바일 파일 선택 드롭다운 */}
        <div className="md:hidden sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2">
          <button
            onClick={() => setMobileFileOpen(!mobileFileOpen)}
            aria-expanded={mobileFileOpen}
            aria-label="변경된 파일 목록 보기"
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            <div className="flex items-center gap-2 min-w-0">
              {selectedFile ? (
                <>
                  <FileIcon filename={selectedFile} size={14} />
                  <span className="truncate text-xs font-bold text-blue-600 dark:text-blue-400">{selectedFile}</span>
                </>
              ) : (
                <span className="text-xs text-slate-400">파일 선택</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-slate-400 font-bold">{files.length} files</span>
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform duration-200 ${mobileFileOpen ? "rotate-180" : ""}`}
              />
            </div>
          </button>

          {mobileFileOpen && (
            <div className="absolute left-0 right-0 top-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-lg z-30 max-h-64 overflow-y-auto">
              {files.map((file) => (
                <button
                  key={file.filename}
                  onClick={() => handleSelectFile(file.filename)}
                  aria-current={selectedFile === file.filename ? "true" : undefined}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
                    selectedFile === file.filename
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileIcon filename={file.filename} size={14} />
                    <span className="text-xs font-bold truncate">{file.filename}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black shrink-0 ml-2">
                    <span className="text-emerald-600">+{file.additions}</span>
                    <span className="text-rose-500">-{file.deletions}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 space-y-4">
          {files.map((file) => (
            <PRDiffViewer key={file.filename} file={file} isActive={selectedFile === file.filename} />
          ))}
        </div>
      </div>
    </div>
  );
}
