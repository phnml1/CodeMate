import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function HeroSection() {
  return (
    <section className="pt-32 pb-20 px-6 overflow-hidden bg-surface-bright">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
        <div className="w-full md:w-3/5 text-left">
          <Badge variant="secondary" className="mb-8 bg-secondary-container text-primary">
            <span>✨</span>
            AI 기반 코드 리뷰
          </Badge>
          <h1 className="font-headline text-5xl md:text-7xl font-extrabold text-on-surface leading-[1.1] tracking-tight mb-8">
            더 나은 코드 작성.{" "}
            <br />
            <span className="bg-linear-to-r from-primary to-primary-container bg-clip-text text-transparent">

              더 스마트한 리뷰.
            </span>{" "}
            <br />
            실시간 협업.
          </h1>
          <p className="text-lg md:text-xl text-on-surface-variant max-w-xl mb-10 leading-relaxed">
            CodeMate는 GitHub 저장소와 연결되어 Claude AI를 통해 모든 PR을 자동으로 리뷰합니다. 팀에게 즉각적이고 실행 가능한 피드백을 제공하세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" className="rounded-full" asChild>
              <Link href="/auth/login">GitHub로 무료 시작하기</Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full">
              기능 살펴보기
            </Button>
          </div>
        </div>
        <div className="w-full md:w-2/5 relative">
          <div className="relative z-10 rounded-2xl overflow-hidden shadow-[0_20px_40px_rgba(0,81,213,0.06)] transform hover:rotate-0 transition-transform duration-500 hover:-rotate-2">
            <Image
              className="w-full h-auto"
              alt="Modern code editor interface showing clean syntax highlighting with a glowing AI suggestion box appearing on the right side"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuACNO9Xd7wGI_nVRAPo_zrspUB8V2T2-vwdW9Y7tINYk1lypK2cGKjAn2xJAxm6fzmunkpVhIv4DgJt7-5GlvouoDYz3jjZLvVUTspWAo0UazeBRP_PjAOlBO7m18q_S3wIDpvrax07DKCLSPlezONOydUo9luFZSKbUJh5ifEnPADxRaa21ZAVESXumFivBqRrKAesq4fH7k5qwRRhaMz5l3t-kF7Alwa9TjxudgY3FHe9zdryf2wmuimIGT85zG_AimdxLL0omgt_"
              width={600}
              height={400}
              priority
            />
          </div>
          {/* Abstract visual accents */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-tertiary/5 rounded-full blur-3xl"></div>
        </div>
      </div>
    </section>
  )
}
