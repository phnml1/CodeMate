"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check, MapPin } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { ReviewIssue } from "@/types/review";
import ReviewBadge from "./ReviewBadge";

interface SuggestionCardProps {
  issue: ReviewIssue;
  onIssueClick?: (issue: ReviewIssue) => void;
}

export default function SuggestionCard({ issue, onIssueClick }: SuggestionCardProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!issue.exampleCode) return;
    await navigator.clipboard.writeText(issue.exampleCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id={`suggestion-card-${issue.originalIndex}`}
      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
      >
        <span className="mt-0.5 text-slate-400 shrink-0">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">
            {issue.title}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <ReviewBadge severity={issue.severity} category={issue.category} />
            {issue.lineNumber != null && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                <MapPin size={10} />
                {issue.filePath}:{issue.lineNumber}
              </span>
            )}
          </div>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
              설명
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {issue.description}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
              제안
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {issue.suggestion}
            </p>
          </div>
          {issue.exampleCode && (
            <div>
              <div className="flex items-center justify-between mb-1">
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
              <SyntaxHighlighter
                language="typescript"
                style={oneDark}
                customStyle={{ borderRadius: "0.5rem", fontSize: "12px", margin: 0, padding: "12px" }}
                wrapLongLines
              >
                {issue.exampleCode}
              </SyntaxHighlighter>
            </div>
          )}
          {onIssueClick && (
            <button
              type="button"
              onClick={() => onIssueClick(issue)}
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
            >
              자세히 보기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
