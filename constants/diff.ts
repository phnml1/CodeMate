import type { LineType } from "@/lib/diff";

export const DIFF_ROW_CLASS: Record<LineType, string> = {
  hunk:    "bg-blue-50 dark:bg-blue-500/10 border-l-4 border-transparent",
  added:   "bg-green-100 dark:bg-emerald-500/20 border-l-4 border-l-green-400",
  removed: "bg-red-100 dark:bg-rose-500/20 border-l-4 border-l-red-400",
  context: "border-l-4 border-transparent",
};

export const DIFF_CODE_CLASS: Record<LineType, string> = {
  hunk:    "text-blue-600 dark:text-blue-400 font-bold",
  added:   "text-emerald-800 dark:text-emerald-300",
  removed: "text-rose-800 dark:text-rose-300",
  context: "text-slate-500 dark:text-slate-400",
};

export const DIFF_SYMBOL: Record<LineType, string> = {
  hunk: " ", added: "+", removed: "-", context: " ",
};
