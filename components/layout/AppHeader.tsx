import { getCurrentUser } from "@/lib/dal/session"
import { SidebarTrigger } from "@/components/ui/sidebar"
import NotificationBell from "@/components/notification/NotificationBell"
import HeaderSearch from "./HeaderSearch"
import HeaderProfile from "./HeaderProfile"
import HeaderPageTitle from "./HeaderPageTitle"

export default async function AppHeader() {
  const user = await getCurrentUser()

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <SidebarTrigger className="p-2 hover:bg-slate-100 rounded-lg transition-colors" />
        <div className="min-w-0 text-sm">
          <HeaderPageTitle />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 md:gap-4">
        <HeaderSearch />
        {user?.id ? <NotificationBell /> : null}
        <HeaderProfile
          user={user ? { name: user.name, email: user.email, image: user.image } : undefined}
        />
      </div>
    </header>
  )
}
