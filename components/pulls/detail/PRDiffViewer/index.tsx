"use client";

import { useState } from "react";
import { parsePatch } from "@/lib/diff";
import type { PRFile } from "@/types/pulls";
import DiffHeader from "./DiffHeader";
import DiffTable from "./DiffTable";

interface PRDiffViewerProps {
  file: PRFile;
  isActive?: boolean;
}

export default function PRDiffViewer({ file, isActive = false }: PRDiffViewerProps) {
  const [collapsed, setCollapsed] = useState(false);
  const lines = file.patch ? parsePatch(file.patch) : [];

  return (
    <div
      id={`diff-${file.filename}`}
      className={`scroll-mt-36 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 transition-all duration-300 mb-4 ${
        isActive
          ? "border border-blue-400 dark:border-blue-500 shadow-md shadow-blue-100 dark:shadow-blue-950/40"
          : "border border-slate-200 dark:border-slate-800 shadow-sm"
      }`}
    >
      <DiffHeader
        file={file}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        isActive={isActive}
      />
      {!collapsed && (
        <div id={`diff-body-${file.filename}`} className="overflow-x-auto min-w-0 min-h-25">
          {file.patch === null ? (
            <div className="p-6 text-center text-sm text-slate-400">
              Binary file or no diff available
            </div>
          ) : (
            <DiffTable lines={lines} />
          )}
        </div>
      )}
    </div>
  );
}
