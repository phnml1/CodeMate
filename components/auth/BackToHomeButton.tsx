import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function BackToHomeButton() {
  return (
    <div className="text-center mt-6">
      <Link
        href="/"
        className="text-slate-600 text-sm hover:text-slate-900 transition-colors inline-flex items-center justify-center gap-2 group"
      >
        <span>메인 페이지로 돌아가기</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  )
}
