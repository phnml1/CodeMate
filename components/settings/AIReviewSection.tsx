"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { controlStyles, surfaceStyles, textStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"

interface ReviewSettings {
  autoReview: boolean
  language: string
  severityLevel: string
}

const DEFAULT: ReviewSettings = {
  autoReview: true,
  language: "ko",
  severityLevel: "normal",
}

async function fetchSettings(): Promise<ReviewSettings> {
  const res = await fetch("/api/settings/ai-review")
  if (!res.ok) return DEFAULT
  const data = await res.json()
  return data.settings ?? DEFAULT
}

async function updateSettings(settings: ReviewSettings): Promise<ReviewSettings> {
  const res = await fetch("/api/settings/ai-review", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  })
  const data = await res.json()
  return data.settings
}

export default function AIReviewSection() {
  const queryClient = useQueryClient()

  const { data: settings = DEFAULT, isLoading } = useQuery({
    queryKey: ["review-settings"],
    queryFn: fetchSettings,
  })

  const { mutate: save } = useMutation({
    mutationFn: updateSettings,
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: ["review-settings"] })
      queryClient.setQueryData(["review-settings"], next)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["review-settings"] })
    },
  })

  if (isLoading) {
    return (
      <section className={cn(surfaceStyles.panel, surfaceStyles.panelPadding)}>
        <h2 className={cn(textStyles.sectionTitle, "mb-4")}>AI 리뷰 설정</h2>
        <p className="text-sm text-slate-400">설정을 불러오는 중...</p>
      </section>
    )
  }

  return (
    <section className={cn(surfaceStyles.panel, surfaceStyles.panelPadding)}>
      <h2 className={cn(textStyles.sectionTitle, "mb-4")}>AI 리뷰 설정</h2>
      <div className="space-y-5">
        {/* 자동 리뷰 토글 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">자동 리뷰</p>
            <p className="text-xs text-slate-400 mt-0.5">PR 생성 시 AI 리뷰를 자동으로 실행합니다.</p>
          </div>
          <button
            onClick={() => save({ ...settings, autoReview: !settings.autoReview })}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              settings.autoReview ? "bg-blue-500" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                settings.autoReview ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* 리뷰 언어 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">리뷰 언어</p>
            <p className="text-xs text-slate-400 mt-0.5">AI 리뷰 코멘트를 작성할 언어를 선택합니다.</p>
          </div>
          <div className="flex gap-1.5">
            {(["ko", "en"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => save({ ...settings, language: lang })}
                className={cn(controlStyles.filterButton, "rounded-lg border",
                  settings.language === lang
                    ? "bg-blue-500 text-white border-blue-500"
                    : "text-slate-600 border-slate-300 hover:bg-slate-50"
                )}
              >
                {lang === "ko" ? "한국어" : "English"}
              </button>
            ))}
          </div>
        </div>

        {/* 심각도 기준 */}
        <div>
          <div className="mb-2">
            <p className="text-sm font-medium text-slate-700">심각도 기준</p>
            <p className="text-xs text-slate-400 mt-0.5">리뷰에서 강조할 이슈의 민감도를 설정합니다.</p>
          </div>
          <div className="flex gap-1.5">
            {(
              [
                { value: "strict", label: "엄격", desc: "LOW 이상 모두 표시" },
                { value: "normal", label: "보통", desc: "MEDIUM 이상 표시" },
                { value: "lenient", label: "관대", desc: "HIGH 이상만 표시" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                onClick={() => save({ ...settings, severityLevel: opt.value })}
                className={cn("flex-1 rounded-lg border px-3 py-2 text-center text-xs font-medium transition-colors",
                  settings.severityLevel === opt.value
                    ? "bg-blue-500 text-white border-blue-500"
                    : "text-slate-600 border-slate-300 hover:bg-slate-50"
                )}
              >
                <span className="block">{opt.label}</span>
                <span className={`block mt-0.5 font-normal ${settings.severityLevel === opt.value ? "text-blue-100" : "text-slate-400"}`}>
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
