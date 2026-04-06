"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertCircle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            오류가 발생했습니다
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            페이지를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            className="bg-blue-700 hover:bg-blue-800 rounded-xl font-bold shadow-lg shadow-blue-700/20 gap-2"
          >
            <RotateCcw size={16} />
            다시 시도
          </Button>
          <Button asChild variant="outline" className="rounded-xl font-bold">
            <Link href="/dashboard">대시보드로 이동</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
