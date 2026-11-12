import Link from "next/link"
import { cn } from "@/lib/utils"

interface ReviewTabsProps {
  active: "ai" | "comments"
}

const tabs = [
  { id: "ai" as const, label: "AI 리뷰", href: "/reviews" },
  { id: "comments" as const, label: "작성된 리뷰", href: "/comments" },
]

export default function ReviewTabs({ active }: ReviewTabsProps) {
  return (
    <nav
      aria-label="리뷰 종류"
      className="flex gap-1 border-b border-slate-200 dark:border-slate-800"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={active === tab.id ? "page" : undefined}
          className={cn(
            "border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
            active === tab.id
              ? "border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
