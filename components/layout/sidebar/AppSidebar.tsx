"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar"

import { SidebarLogo } from "./SidebarLogo"
import { SidebarNav } from "./SidebarNav"
import { SidebarUser } from "./SidebarUser"

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-3">
        <SidebarLogo />
      </SidebarHeader>
      <SidebarSeparator className="mx-0" />
      <SidebarContent>
        <SidebarNav />
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <SidebarUser />
      </SidebarFooter>
    </Sidebar>
  )
}
