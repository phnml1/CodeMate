import { Separator } from "@/components/ui/separator"

export function LoginFooter() {
  return (
    <>
      <Separator className="bg-slate-200" />

      <p className="text-slate-400 text-xs text-center leading-relaxed">
        로그인하면{" "}
        <a href="/terms" className="text-blue-600 hover:underline">
          서비스 약관
        </a>{" "}
        및{" "}
        <a href="/privacy" className="text-blue-600 hover:underline">
          개인정보처리방침
        </a>
        에 동의하게 됩니다
      </p>
      <p className="text-slate-400 text-xs text-center leading-relaxed">
        개인정보·계정 문의: {" "}
        <a href="mailto:juyung0903@naver.com" className="text-blue-600 hover:underline">
          juyung0903@naver.com
        </a>
      </p>
    </>
  )
}
