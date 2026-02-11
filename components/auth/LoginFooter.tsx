import { Separator } from "@/components/ui/separator"
import { ArrowRight } from "lucide-react"

export function LoginFooter() {
  return (
    <>
      <Separator className="bg-slate-200" />

      <p className="text-slate-400 text-xs text-center leading-relaxed">
        로그인하면{" "}
        <a href="#" className="text-blue-600 hover:underline">
          서비스 약관
        </a>{" "}
        및{" "}
        <a href="#" className="text-blue-600 hover:underline">
          개인정보처리방침
        </a>
        에 동의하게 됩니다
      </p>
    </>
  )
}

export function BackToHomeButton() {
  return (
    <div className="text-center mt-6">
      <button className="text-slate-600 text-sm hover:text-slate-900 transition-colors flex items-center justify-center gap-2 mx-auto group">
        <span>메인 페이지로 돌아가기</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  )
}
