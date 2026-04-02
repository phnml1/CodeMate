import { Card } from "@/components/ui/card"

const features = [
  {
    icon: "🔗",
    title: "GitHub 연동",
    description: "기존 워크플로우와 원활하게 동기화됩니다. 별도의 설정 없이 저장소에 직접 연결됩니다.",
  },
  {
    icon: "🧠",
    title: "AI 코드 리뷰",
    description:
      "로직, 보안 및 성능에 대한 즉각적인 피드백을 받으세요. 수십억 줄의 코드로 학습된 최첨단 Claude 모델을 기반으로 합니다.",
  },
  {
    icon: "💬",
    title: "실시간 협업",
    description:
      "PR 내에서 직접 제안 사항에 대해 협업하세요. 팀원을 태그하고, 의견을 해결하며 그 어느 때보다 빠르게 반복하세요.",
  },
  {
    icon: "📊",
    title: "품질 대시보드",
    description:
      "시간에 따른 팀의 코드 건강 상태를 모니터링하세요. 패턴을 파악하고 기술 부채를 줄이며 고품질 기여를 장려합니다.",
  },
]

export default function FeaturesGrid() {
  return (
    <section className="py-24 px-6 bg-surface-container-low" id="features">
      <div className="max-w-7xl mx-auto">
        <div className="mb-20 text-center md:text-left">
          <h2 className="font-headline text-4xl font-bold text-on-surface mb-4">엘리트 팀을 위한 강력한 도구</h2>
          <div className="h-1.5 w-24 bg-primary rounded-full"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, idx) => (
            <Card
              key={idx}
              className="p-10 bg-surface-container-lowest shadow-[0_20px_40px_rgba(0,81,213,0.06)] group hover:-translate-y-2 transition-all duration-300 border-0"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-colors text-xl">
                {feature.icon}
              </div>
              <h3 className="font-headline text-2xl font-bold text-on-surface mb-4">{feature.title}</h3>
              <p className="text-on-surface-variant leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
