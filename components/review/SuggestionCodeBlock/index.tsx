"use client";

import { useEffect, useState, type ComponentType } from "react";
import { Check, Copy } from "lucide-react";
import PlainCodeBlock from "./PlainCodeBlock";

interface SuggestionCodeBlockProps {
  code: string;
  language?: string;
}

type HighlightedCodeComponent = ComponentType<{
  code: string;
  language?: string;
}>;

export default function SuggestionCodeBlock({
  code,
  language = "typescript",
}: SuggestionCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [HighlightedCode, setHighlightedCode] =
    useState<HighlightedCodeComponent | null>(null);

  useEffect(() => {
    let cancelled = false;

    void import("./SyntaxHighlightedCode")
      .then((module) => {
        if (!cancelled) {
          setHighlightedCode(() => module.default);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHighlightedCode(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!copied) return;

    const timeoutId = window.setTimeout(() => {
      setCopied(false);
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          예시 코드
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-[11px] text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
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

      {HighlightedCode ? (
        <HighlightedCode code={code} language={language} />
      ) : (
        <PlainCodeBlock code={code} />
      )}
    </div>
  );
}
