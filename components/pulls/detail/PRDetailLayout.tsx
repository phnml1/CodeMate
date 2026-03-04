"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import PRFileList from "./PRFileList";
import PRDetailHeader from "./PRDetailHeader";
import type { PRFile, PullRequest } from "@/types/pulls";

interface PRDetailLayoutProps {
  pr: PullRequest;
  files: PRFile[];
}

export default function PRDetailLayout({ pr, files }: PRDetailLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | undefined>(files[0]?.filename);

  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[24px] shadow-sm relative min-w-0 overflow-hidden mt-2">
      <PRFileList
        files={files}
        selectedFile={selectedFile}
        onSelectFile={setSelectedFile}
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
      />
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950 relative">
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="absolute left-0 top-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-r-lg shadow-md hidden md:block z-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        )}
        <PRDetailHeader pr={pr} />
      </div>
    </div>
  );
}
