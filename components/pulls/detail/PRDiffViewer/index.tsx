"use client";

import { useState } from "react";
import { parsePatch } from "@/lib/diff";
import type { PRFile } from "@/types/pulls";
import DiffHeader from "./DiffHeader";
import DiffTable from "./DiffTable";

interface PRDiffViewerProps {
  file: PRFile;
}

export default function PRDiffViewer({ file }: PRDiffViewerProps) {
  const [collapsed, setCollapsed] = useState(false);
  const lines = file.patch ? parsePatch(file.patch) : [];

  return (
    <div
      id={`diff-${file.filename}`}
      className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm transition-all duration-300 mb-4"
    >
      <DiffHeader
        file={file}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />
      {!collapsed && (
        <div className="overflow-x-auto min-w-0 min-h-[100px]">
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
