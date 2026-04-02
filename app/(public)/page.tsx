import TopNavBar from "@/components/landing/TopNavBar"
import HeroSection from "@/components/landing/HeroSection"
import FeaturesGrid from "@/components/landing/FeaturesGrid"
import HowItWorks from "@/components/landing/HowItWorks"
import TargetAudience from "@/components/landing/TargetAudience"
import FinalCTA from "@/components/landing/FinalCTA"
import Footer from "@/components/landing/Footer"

export const metadata = {
  title: "CodeMate | AI-Powered Code Review",
  description:
    "CodeMate는 GitHub 저장소와 연결되어 Claude AI를 통해 모든 PR을 자동으로 리뷰합니다. 팀에게 즉각적이고 실행 가능한 피드백을 제공하세요.",
}

export default function LandingPage() {
  return (
    <div
      className="min-h-screen bg-surface font-body text-on-surface"
      style={{
        '--primary': '#2563EB',
        '--primary-container': '#1e40af',
      } as React.CSSProperties}
    >
      <TopNavBar />
      <main className="pt-16">
        <HeroSection />
        <FeaturesGrid />
        <HowItWorks />
        <TargetAudience />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
