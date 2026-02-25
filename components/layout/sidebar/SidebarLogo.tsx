"use client"

import { X } from "lucide-react"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function SidebarLogo() {
  const { toggleSidebar } = useSidebar()

  return (
    <div className="flex items-center justify-between">
      <SidebarMenu className="flex-1">
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className="justify-center hover:bg-transparent active:bg-transparent data-[active=true]:bg-transparent group-data-[collapsible=icon]:mx-auto"
          >
            <div className="flex size-8 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/50">
              <span className="text-lg">🤖</span>
            </div>
            <span className="text-lg font-bold tracking-tight group-data-[collapsible=icon]:hidden">
              CodeMate
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <button
        onClick={toggleSidebar}
        className="text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors p-1.5 rounded-md hover:bg-sidebar-accent group-data-[collapsible=icon]:hidden"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
