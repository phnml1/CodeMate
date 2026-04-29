"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, MapPin } from "lucide-react";
import type { ReviewIssue } from "@/types/review";
import ReviewBadge from "./ReviewBadge";
import SuggestionCodeBlock from "./SuggestionCodeBlock";

interface SuggestionCardProps {
  issue: ReviewIssue;
  onIssueClick?: (issue: ReviewIssue) => void;
}

export default function SuggestionCard({
  issue,
  onIssueClick,
}: SuggestionCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      id={`suggestion-card-${issue.originalIndex}`}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
      >
        <span className="mt-0.5 shrink-0 text-slate-400">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-slate-800 dark:text-slate-200">
            {issue.title}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <ReviewBadge severity={issue.severity} category={issue.category} />
            {issue.lineNumber != null && (
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-400 dark:text-slate-500">
                <MapPin size={10} />
                {issue.filePath}:{issue.lineNumber}
              </span>
            )}
          </div>
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3 dark:border-slate-800">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              설명
            </p>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {issue.description}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              제안
            </p>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {issue.suggestion}
            </p>
          </div>
          {issue.exampleCode && (
            <SuggestionCodeBlock code={issue.exampleCode} language="typescript" />
          )}
          {onIssueClick && (
            <button
              type="button"
              onClick={() => onIssueClick(issue)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              자세히 보기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
