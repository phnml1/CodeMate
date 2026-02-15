"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FolderGit2,
  GitPullRequest,
  MessageSquare,
  BarChart3,
  Settings,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navItems = [
  { label: "대시보드", icon: LayoutDashboard, href: "/dashboard" },
  { label: "저장소", icon: FolderGit2, href: "/dashboard/repositories" },
  { label: "Pull Requests", icon: GitPullRequest, href: "/dashboard/pulls" },
  { label: "댓글", icon: MessageSquare, href: "/dashboard/comments" },
  { label: "통계", icon: BarChart3, href: "/dashboard/stats" },
  { label: "설정", icon: Settings, href: "/dashboard/settings" },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.label}
                  className={cn(
                    "h-auto px-4 py-3 rounded-xl",
                    isActive &&
                      "data-[active=true]:bg-blue-700 data-[active=true]:text-white data-[active=true]:shadow-lg data-[active=true]:shadow-blue-700/30 data-[active=true]:font-semibold hover:bg-blue-600 hover:text-white"
                  )}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
