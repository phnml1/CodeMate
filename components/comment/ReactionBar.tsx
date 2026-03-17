"use client"

import type { ReactionEmoji, Reactions } from "@/types/comment"

const EMOJIS: ReactionEmoji[] = ["👍", "❤️", "🎉", "🚀", "👀"]

interface ReactionBarProps {
  reactions: Reactions
  currentUserId: string
  onToggle: (emoji: ReactionEmoji) => void
}

export default function ReactionBar({ reactions, currentUserId, onToggle }: ReactionBarProps) {
  const hasAnyReaction = EMOJIS.some((e) => (reactions[e]?.length ?? 0) > 0)

  return (
    <div className="flex items-center gap-1 flex-wrap mt-1">
      {EMOJIS.map((emoji) => {
        const users = reactions[emoji] ?? []
        const count = users.length
        const active = users.includes(currentUserId)

        if (count === 0 && !active) return null

        return (
          <button
            key={emoji}
            onClick={() => onToggle(emoji)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
              active
                ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="font-medium">{count}</span>}
          </button>
        )
      })}

      {/* 이모지 추가 버튼 */}
      <div className="relative group">
        <button className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-dashed border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-500 dark:border-slate-600 dark:text-slate-500 dark:hover:border-slate-500 transition-colors">
          <span>+</span>
          <span>😊</span>
        </button>
        <div className="absolute bottom-full left-0 mb-1 hidden group-focus-within:flex group-hover:flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-1.5 gap-1 z-10">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onToggle(emoji)}
              className="text-lg hover:scale-125 transition-transform p-0.5 rounded"
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
