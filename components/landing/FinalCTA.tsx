import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function FinalCTA() {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="max-w-5xl mx-auto bg-primary rounded-3xl p-12 md:p-20 text-center relative z-10 shadow-2xl">
        <h2 className="font-headline text-4xl md:text-5xl font-extrabold text-white mb-8">
          코드 리뷰의 혁신을 경험할 준비가 되셨나요?
        </h2>
        <p className="text-white/80 text-lg md:text-xl mb-12 max-w-2xl mx-auto">
          AI 기반 인사이트로 더 나은 코드를 배포하는 수천 명의 개발자와 함께하세요. 무료로 시작하세요.
        </p>
        <Button size="lg" variant="secondary" className="rounded-full text-primary font-bold" asChild>
          <Link href="/auth/login">무료로 시작하기</Link>
        </Button>
        {/* Decorative circle */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
      </div>
    </section>
  )
}
