'use client'

import { useEffect, useState } from "react"

const steps = [
  {
    number: 1,
    title: "저장소 연결",
    description: "클릭 두 번으로 GitHub 저장소를 연결하세요. 권한은 안전하게 처리됩니다.",
  },
  {
    number: 2,
    title: "PR 생성",
    description: "CodeMate가 AI로 자동 리뷰하여 인라인 제안과 상위 수준의 요약본을 제공합니다.",
  },
  {
    number: 3,
    title: "자신 있게 머지",
    description:
      "제안 사항을 논의하고 팀과 함께 반복하며 코드가 최고 표준을 충족함을 확인하고 머지하세요.",
  },
]

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(2)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev === 3 ? 1 : prev + 1))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <section className="py-24 px-6 bg-surface-bright" id="how-it-works">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="font-headline text-4xl font-bold text-on-surface mb-6">현대적 개발 속도에 맞춘 설계</h2>
          <p className="text-lg text-on-surface-variant">
            매일 더 빠르게, 더 높은 품질의 코드를 배포하기 위한 세 가지 간단한 단계입니다.
          </p>
        </div>
        <div className="relative flex flex-col md:flex-row justify-between gap-12">
          {/* Connector Line */}
          <div className="hidden md:block absolute top-24 left-0 w-full h-0.5 bg-outline-variant/30 z-0"></div>

          {steps.map((step) => {
            const isActive = activeStep === step.number
            return (
              <div
                key={isActive ? `active-${step.number}-${activeStep}` : step.number}
                className={`relative z-10 flex-1 text-center md:text-left group ${isActive ? 'animate-step-activate' : ''}`}
              >
                <div
                  className={`w-16 h-16 rounded-full border-4 shadow-xl flex items-center justify-center font-bold text-xl mb-8 mx-auto md:mx-0 transition-all duration-500 ${
                    isActive
                      ? "bg-primary text-white border-transparent shadow-2xl shadow-primary/40"
                      : "bg-surface-container-lowest text-primary border-surface"
                  }`}
                >
                  {step.number}
                </div>
                <h4 className={`font-headline text-xl font-bold mb-4 transition-colors duration-500 ${
                  isActive ? "text-primary" : "text-on-surface"
                }`}>
                  {step.title}
                </h4>
                <p className={`transition-colors duration-500 ${
                  isActive ? "text-primary font-medium" : "text-on-surface-variant"
                }`}>
                  {step.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
