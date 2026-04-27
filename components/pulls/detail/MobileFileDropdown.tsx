"use client";

import { ChevronDown } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import FileIcon from "./FileIcon";
import { useCachedPRFiles } from "@/hooks/pr-detail/usePRDetailCachedQueries";
import { usePRDetailFileNavigation } from "@/hooks/pr-detail/usePRDetailFileNavigation";
import { usePRDetailStore } from "@/stores/prDetailStore";

interface MobileFileDropdownProps {
  prId: string;
}

export default function MobileFileDropdown({
  prId,
}: MobileFileDropdownProps) {
  const { data: files = [] } = useCachedPRFiles(prId);
  const { selectAndScrollToFile } = usePRDetailFileNavigation();
  const { selectedFile, mobileFileOpen, setMobileFileOpen } = usePRDetailStore(
    useShallow((state) => ({
      selectedFile: state.selectedFile,
      mobileFileOpen: state.mobileFileOpen,
      setMobileFileOpen: state.setMobileFileOpen,
    }))
  );

  return (
    <div className="relative border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900 md:hidden">
      <button
        onClick={() => setMobileFileOpen(!mobileFileOpen)}
        aria-expanded={mobileFileOpen}
        aria-label="변경된 파일 목록 보기"
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
      >
        <div className="flex min-w-0 items-center gap-2">
          {selectedFile ? (
            <>
              <FileIcon filename={selectedFile} size={14} />
              <span className="truncate text-xs font-bold text-blue-600 dark:text-blue-400">
                {selectedFile}
              </span>
            </>
          ) : (
            <span className="text-xs text-slate-400">파일 선택</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400">
            {files.length} files
          </span>
          <ChevronDown
            size={14}
            className={`text-slate-400 transition-transform duration-200 ${
              mobileFileOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {mobileFileOpen && (
        <div className="absolute left-0 right-0 top-full z-30 max-h-64 overflow-y-auto border-b border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
          {files.map((file) => (
            <button
              key={file.filename}
              onClick={() => selectAndScrollToFile(file.filename)}
              aria-current={selectedFile === file.filename ? "true" : undefined}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors ${
                selectedFile === file.filename
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileIcon filename={file.filename} size={14} />
                <span className="truncate text-xs font-bold">
                  {file.filename}
                </span>
              </div>
              <div className="ml-2 flex shrink-0 items-center gap-1.5 text-[10px] font-black">
                <span className="text-emerald-600">+{file.additions}</span>
                <span className="text-rose-500">-{file.deletions}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
