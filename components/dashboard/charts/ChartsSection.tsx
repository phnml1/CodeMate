import CodeQualityChartCard from "./CodeQualityChartCard"
import IssueDistributionCard from "./IssueDistributionCard"

export default function ChartsSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
      <CodeQualityChartCard />
      <IssueDistributionCard />
    </div>
  )
}
