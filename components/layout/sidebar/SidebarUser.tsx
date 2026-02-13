"use client"

import { LogOut } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function SidebarUser() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" tooltip="프로필">
          <Avatar className="size-8">
            <AvatarImage src="" alt="user avatar" />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm font-bold">
              홍
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="text-sm font-semibold">홍길동</span>
            <span className="flex items-center gap-1 text-xs text-sidebar-foreground/60">
              <LogOut className="size-3" />
              로그아웃
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
