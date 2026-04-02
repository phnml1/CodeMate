'use client'

import { useState } from "react"
import { Card } from "@/components/ui/card"

const audiences = [
  {
    icon: "🎓",
    title: "주니어 개발자",
    description:
      "CodeMate를 잠들지 않는 지치지 않는 시니어 멘토라고 생각하세요. 본인의 코드에 대한 실질적인 피드백을 통해 모범 사례와 업계 패턴을 배울 수 있습니다.",
    id: 0,
  },
  {
    icon: "🚀",
    title: "소규모 스타트업",
    description:
      "속도를 늦추지 않고도 품질을 유지하세요. 높은 코드 품질을 유지하면서 엔지니어링 팀의 생산성을 확장하고 창업자의 수동 리뷰 부담을 줄입니다.",
    id: 1,
  },
  {
    icon: "👥",
    title: "오픈소스 메인테이너",
    description:
      "수많은 커뮤니티 기여를 손쉽게 관리하세요. CodeMate가 1차 스크리닝을 수행하므로 모든 PR의 아키텍처적 영향에 집중할 수 있습니다.",
    id: 2,
  },
]

export default function TargetAudience() {
  const [prominentId, setProminentId] = useState<number>(1)

  return (
    <section className="py-24 px-6 bg-surface-container-low">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-headline text-4xl font-bold text-on-surface mb-16 text-center">
          모든 성장 단계를 위한 솔루션
        </h2>
        <div className="flex flex-col lg:flex-row items-stretch gap-8">
          {audiences.map((audience) => {
            const isProminent = prominentId === audience.id
            return (
              <Card
                key={audience.id}
                onMouseEnter={() => setProminentId(audience.id)}
                onMouseLeave={() => {}}
                className={`flex-1 p-10 shadow-[0_20px_40px_rgba(0,81,213,0.06)] flex flex-col border-0 transition-all duration-300 cursor-pointer ${
                  isProminent
                    ? "bg-white border-t-4 border-primary transform lg:-translate-y-4 scale-105"
                    : "bg-white/60 backdrop-blur-sm scale-100"
                }`}
              >
                <div className="mb-8 text-4xl transition-transform duration-300">{audience.icon}</div>
                <h3 className="font-headline text-2xl font-bold text-on-surface mb-4">{audience.title}</h3>
                <p className="text-on-surface-variant grow leading-relaxed">{audience.description}</p>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
