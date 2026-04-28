"use client";

import { useInlineTypingBanner } from "@/hooks/pr-detail/useInlineTypingBanner";

interface InlineTypingBannerProps {
  prId: string;
}

export default function InlineTypingBanner({ prId }: InlineTypingBannerProps) {
  const { visibleInlineTyping, handleTypingItemClick } =
    useInlineTypingBanner(prId);

  if (visibleInlineTyping.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-1.5 dark:border-amber-800/50 dark:bg-amber-950/30">
      <span className="shrink-0 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
        댓글 작성 중
      </span>
      {visibleInlineTyping.map((item) => (
        <button
          key={item.userId}
          type="button"
          onClick={() => handleTypingItemClick(item)}
          className="flex cursor-pointer items-center gap-1 text-[10px] text-amber-700 transition-colors hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
          title={`${item.filePath}:${item.lineNumber} 으로 이동`}
        >
          <span className="font-semibold">{item.userName}</span>
          <span className="opacity-60">-&gt;</span>
          <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[9px] transition-colors hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60">
            {item.filePath.split("/").pop()}:{item.lineNumber}
          </code>
          <span className="ml-0.5 flex items-end gap-0.5">
            <span className="h-1 w-1 animate-bounce rounded-full bg-amber-500 [animation-delay:0ms]" />
            <span className="h-1 w-1 animate-bounce rounded-full bg-amber-500 [animation-delay:150ms]" />
            <span className="h-1 w-1 animate-bounce rounded-full bg-amber-500 [animation-delay:300ms]" />
          </span>
        </button>
      ))}
    </div>
  );
}
