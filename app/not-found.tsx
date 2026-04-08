import Link from "next/link"
import { FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
            <FileQuestion className="w-10 h-10 text-blue-500" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-slate-900 dark:text-slate-100">404</h1>
          <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300">
            페이지를 찾을 수 없어요
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            요청하신 페이지가 존재하지 않거나 이동되었습니다.
          </p>
        </div>
        <Button asChild className="bg-blue-700 hover:bg-blue-800 rounded-xl font-bold shadow-lg shadow-blue-700/20">
          <Link href="/dashboard">대시보드로 돌아가기</Link>
        </Button>
      </div>
    </div>
  )
}
