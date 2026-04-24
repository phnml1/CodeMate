import { AlertCircle, RefreshCw, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface StatsChartLoadingProps {
  variant?: "chart" | "pie"
}

interface StatsChartEmptyProps {
  icon: LucideIcon
  message: string
  className?: string
}

interface StatsChartErrorProps {
  message: string
  onRetry?: () => void
  className?: string
}

export function StatsChartLoading({
  variant = "chart",
}: StatsChartLoadingProps) {
  if (variant === "pie") {
    return (
      <div className="flex flex-col items-center gap-6">
        <Skeleton className="size-48 rounded-full" />
        <div className="w-full space-y-3">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-4 w-full rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-70 w-full sm:h-85">
      <Skeleton className="h-full w-full rounded-md" />
    </div>
  )
}

export function StatsChartEmpty({
  icon: Icon,
  message,
  className,
}: StatsChartEmptyProps) {
  return (
    <div
      className={`flex h-70 w-full flex-col items-center justify-center text-slate-400 sm:h-85 ${className ?? ""}`}
    >
      <Icon className="mb-3 size-10 text-slate-300" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  )
}

export function StatsChartError({
  message,
  onRetry,
  className,
}: StatsChartErrorProps) {
  return (
    <div
      className={`flex h-70 w-full flex-col items-center justify-center gap-3 text-center sm:h-85 ${className ?? ""}`}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-300">
        <AlertCircle size={20} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Failed to load this section
        </p>
        <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">
          {message}
        </p>
      </div>
      {onRetry && (
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw size={14} />
          Retry
        </Button>
      )}
    </div>
  )
}
