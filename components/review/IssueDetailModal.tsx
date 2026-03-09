"use client";

import { useState } from "react";
import { Copy, Check, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ReviewIssue } from "@/types/review";
import ReviewBadge from "./ReviewBadge";

interface IssueDetailModalProps {
  issue: ReviewIssue | null;
  onClose: () => void;
}

export default function IssueDetailModal({ issue, onClose }: IssueDetailModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!issue?.exampleCode) return;
    await navigator.clipboard.writeText(issue.exampleCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={issue !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg w-full max-h-[85vh] overflow-y-auto">
        {issue && (
          <>
            <DialogHeader>
              <div className="flex items-start gap-3 pr-6">
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-base leading-snug">
                    {issue.title}
                  </DialogTitle>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <ReviewBadge severity={issue.severity} category={issue.category} />
                    {issue.lineNumber != null && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                        <MapPin size={10} />
                        {issue.filePath}:{issue.lineNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  설명
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {issue.description}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  제안
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {issue.suggestion}
                </p>
              </div>

              {issue.exampleCode && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      예시 코드
                    </p>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check size={12} className="text-emerald-500" />
                          <span className="text-emerald-500">복사됨</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>복사</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="rounded-lg bg-slate-950 dark:bg-black text-slate-100 text-[12px] font-mono p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                    {issue.exampleCode}
                  </pre>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
