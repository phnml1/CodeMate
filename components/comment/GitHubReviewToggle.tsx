"use client"

import { Github } from "lucide-react"

export default function GitHubReviewToggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="GitHub에도 리뷰 등록"
      title={checked ? "GitHub 리뷰 등록 켜짐" : "GitHub 리뷰 등록 꺼짐"}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${checked
        ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
        : "border-slate-300 bg-white text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white"}`}
    >
      <Github className="size-4" aria-hidden="true" />
    </button>
  )
}
