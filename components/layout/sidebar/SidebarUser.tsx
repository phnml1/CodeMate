"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { LogoutButton } from "./LogoutButton"

interface SidebarUserProps {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function SidebarUser({ user }: SidebarUserProps) {
  const fallback = user?.name?.[0]?.toUpperCase() ?? "U"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" tooltip="프로필">
          <Avatar className="size-8">
            <AvatarImage src={user?.image ?? ""} alt={user?.name ?? "user"} />
            <AvatarFallback className="bg-linear-to-br from-purple-500 to-pink-500 text-white text-sm font-bold">
              {fallback}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="text-sm font-semibold">{user?.name ?? "사용자"}</span>
            <LogoutButton />
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
