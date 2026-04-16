"use client"

import { cn } from "@/lib/utils"

export const panelClass =
  "rounded-md border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
export const panelPaddingClass = "p-4 sm:p-6 md:p-8"
export const gridGapClass = "gap-4 sm:gap-6"

export function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={cn(panelClass, "p-4 sm:p-5")}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-50">{value}</p>
    </div>
  )
}

export function DarkMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/10 p-3">
      <p className="text-xs text-slate-300">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}
