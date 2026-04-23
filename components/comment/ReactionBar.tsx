"use client"

import { cn } from "@/lib/utils"
import type { ReactionEmoji, Reactions } from "@/types/comment"

const EMOJIS: ReactionEmoji[] = ["👍", "❤️", "🎉", "🚀", "👀"]

interface ReactionBarProps {
  reactions: Reactions
  currentUserId: string
  onToggle: (emoji: ReactionEmoji) => void
  className?: string
  disabled?: boolean
}

export default function ReactionBar({
  reactions,
  currentUserId,
  onToggle,
  className,
  disabled = false,
}: ReactionBarProps) {
  return (
    <div className={cn("mt-1 flex flex-wrap items-center gap-1", className)}>
      {EMOJIS.map((emoji) => {
        const users = reactions[emoji] ?? []
        const count = users.length
        const active = users.includes(currentUserId)

        if (count === 0 && !active) return null

        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggle(emoji)}
            disabled={disabled}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
              active
                ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="font-medium">{count}</span>}
          </button>
        )
      })}

      <div className="group relative">
        <button
          type="button"
          disabled={disabled}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-400 transition-colors hover:border-slate-400 hover:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-500 dark:hover:border-slate-500"
        >
          <span>+</span>
          <span>추가</span>
        </button>
        <div className="absolute bottom-full left-0 z-10 mb-1 hidden gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg group-hover:flex group-focus-within:flex dark:border-slate-700 dark:bg-slate-800">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onToggle(emoji)}
              disabled={disabled}
              className="rounded p-0.5 text-lg transition-transform hover:scale-125 disabled:cursor-not-allowed"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
