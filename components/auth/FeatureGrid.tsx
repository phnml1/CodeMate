import { Check } from "lucide-react"

const features = [
  "GitHub Repository 연동",
  "자동 AI 코드 리뷰",
  "실시간 팀 협업",
  "코드 품질 대시보드",
]

export function FeatureGrid() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {features.map((feature) => (
        <div
          key={feature}
          className="flex items-center gap-2 bg-slate-50 rounded-lg p-3 hover:bg-blue-50 hover:border-blue-100 border border-slate-100 transition-all"
        >
          <div className="w-6 h-6 bg-linear-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center shrink-0 shadow-sm">
            <Check className="w-3.5 h-3.5 text-white stroke-3" />
          </div>
          <span className="text-slate-700 text-xs font-medium">{feature}</span>
        </div>
      ))}
    </div>
  )
}
