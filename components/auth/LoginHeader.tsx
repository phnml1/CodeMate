import { Sparkles } from "lucide-react"

export function LoginHeader() {
  return (
    <div className="flex flex-col items-center">
      <div className="w-20 h-20 bg-linear-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/50 mb-5 hover:scale-110 transition-transform duration-300">
        <span className="text-5xl">🤖</span>
      </div>
      <h1 className="text-slate-900 text-3xl font-bold tracking-tight mb-2">
        CodeMate
      </h1>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full">
        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
        <span className="text-blue-600 text-xs font-semibold">
          AI 기반 코드 리뷰
        </span>
      </div>
    </div>
  )
}
