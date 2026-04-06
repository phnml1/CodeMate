"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function GlobalError({
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
    <html>
      <body>
        <div className="min-h-svh flex flex-col items-center justify-center bg-slate-50 p-4">
          <div className="text-center space-y-6 max-w-md">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-900">오류가 발생했습니다</h1>
              <p className="text-sm text-slate-500">
                예기치 않은 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={reset}
                className="bg-blue-700 hover:bg-blue-800 rounded-xl font-bold shadow-lg shadow-blue-700/20"
              >
                다시 시도
              </Button>
              <Button asChild variant="outline" className="rounded-xl font-bold">
                <Link href="/dashboard">대시보드로 이동</Link>
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
