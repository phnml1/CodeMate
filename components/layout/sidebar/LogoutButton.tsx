"use client"

import { LogOut } from "lucide-react"
import { signOut } from "next-auth/react"

export function LogoutButton() {
  return (
    <span
      role="button"
      onClick={() => signOut({ callbackUrl: "/auth/login" })}
      className="flex items-center gap-1 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
    >
      <LogOut className="size-3" />
      로그아웃
    </span>
  )
}
