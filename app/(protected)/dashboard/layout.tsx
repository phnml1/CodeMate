import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1 p-2" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-sm font-medium">대시보드</h1>
      </header>
      <main className="flex-1 p-6">
        {children}
      </main>
    </>
  )
}
