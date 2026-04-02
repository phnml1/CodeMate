import { auth } from "@/lib/auth"
import { SidebarTrigger } from "@/components/ui/sidebar"
import NotificationBell from "@/components/notification/NotificationBell"
import HeaderSearch from "./HeaderSearch"
import HeaderProfile from "./HeaderProfile"

export default async function AppHeader() {
  const session = await auth()
  const user = session?.user

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="p-2 hover:bg-slate-100 rounded-lg transition-colors" />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-900 font-bold">대시보드</span>
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <HeaderSearch />
        <NotificationBell />
        <HeaderProfile
          user={user ? { name: user.name, email: user.email, image: user.image } : undefined}
        />
      </div>
    </header>
  )
}
