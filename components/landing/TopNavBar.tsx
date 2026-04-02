import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function TopNavBar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-slate-50/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm dark:shadow-none">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white font-headline">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-primary to-primary-container flex items-center justify-center text-lg">
            🤖
          </div>
          <span>CodeMate</span>
        </div>
        <div className="hidden md:flex items-center gap-8 font-body text-sm font-medium tracking-tight">
          <a className="text-slate-600 dark:text-slate-400 hover:text-blue-500 transition-colors duration-200" href="#features">
            기능
          </a>
          <a className="text-slate-600 dark:text-slate-400 hover:text-blue-500 transition-colors duration-200" href="#how-it-works">
            사용 방법
          </a>
        </div>
        <div className="flex items-center gap-4">
          <Button size="sm" className="rounded-full" asChild>
            <Link href="/auth/login">무료로 시작하기</Link>
          </Button>
        </div>
      </div>
    </nav>
  )
}
