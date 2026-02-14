import StatCards from "@/components/dashboard/stat-cards/StatCards"
import ChartsSection from "@/components/dashboard/charts/ChartsSection"
import RecentPRSection from "@/components/dashboard/recent-prs/RecentPRSection"

export default function Page() {
  return (
    <div className="max-w-350 mx-auto space-y-4 sm:space-y-6">
      <StatCards />
      <ChartsSection />
      <RecentPRSection />
    </div>
  )
}
