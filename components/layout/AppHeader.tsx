import { SidebarTrigger } from "@/components/ui/sidebar"
import { Search, Bell } from "lucide-react"

export default function AppHeader() {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="p-2 hover:bg-slate-100 rounded-lg transition-colors" />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-900 font-bold">대시보드</span>
          
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="검색..."
            className="w-64 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
        <button className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <Search className="w-5 h-5 text-slate-600" />
        </button>
        <button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-slate-600" />
          <div className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow-sm">
            <span className="text-white text-[10px] font-bold">3</span>
          </div>
        </button>
        <div className="w-8 h-8 bg-linear-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center cursor-pointer hover:shadow-lg hover:scale-105 transition-all">
          <span className="text-white text-sm font-bold">홍</span>
        </div>
      </div>
    </header>
  )
}
