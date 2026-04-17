import type { PropsWithChildren } from "react"
import { layoutStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"

interface PageContainerProps extends PropsWithChildren {
  size?: "default" | "narrow" | "wide"
  className?: string
}

const sizeClass = {
  default: layoutStyles.page,
  narrow: layoutStyles.narrowPage,
  wide: layoutStyles.widePage,
} as const

export function PageContainer({
  size = "default",
  className,
  children,
}: PageContainerProps) {
  return <div className={cn(sizeClass[size], className)}>{children}</div>
}
