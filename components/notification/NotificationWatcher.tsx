"use client"

import { usePathname } from "next/navigation"
import { useNotificationSummary } from "@/hooks/useNotifications"
import { isProtectedPath } from "@/lib/protected-path"

export default function NotificationWatcher() {
  const pathname = usePathname()
  useNotificationSummary({ enabled: isProtectedPath(pathname) })
  return null
}
