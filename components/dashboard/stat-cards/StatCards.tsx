import CodeQualityCard from "./CodeQualityCard"
import OpenPRCard from "./OpenPRCard"
import WeeklyReviewCard from "./WeeklyReviewCard"

export default function StatCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <CodeQualityCard />
      <OpenPRCard />
      <WeeklyReviewCard />
    </div>
  )
}
