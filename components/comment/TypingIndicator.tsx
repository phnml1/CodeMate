"use client"

interface TypingIndicatorProps {
  names: string[]
}

export default function TypingIndicator({ names }: TypingIndicatorProps) {
  if (names.length === 0) return null

  const label =
    names.length === 1
      ? `${names[0]}님이 입력 중`
      : `${names[0]} 외 ${names.length - 1}명이 입력 중`

  return (
    <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 px-1">
      <span>{label}</span>
      <span className="flex items-end gap-0.5 h-3">
        <span className="w-1 h-1 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1 h-1 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1 h-1 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:300ms]" />
      </span>
    </div>
  )
}
