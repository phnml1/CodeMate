import { type QualityTrendItem, type IssueSeverityItem } from "@/lib/dashboard"
import CodeQualityChartCard from "./CodeQualityChartCard"
import IssueDistributionCard from "./IssueDistributionCard"

interface ChartsSectionProps {
  qualityTrend: QualityTrendItem[]
  issueSeverity: IssueSeverityItem[]
}

export default function ChartsSection({ qualityTrend, issueSeverity }: ChartsSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
      <CodeQualityChartCard qualityTrend={qualityTrend} />
      <IssueDistributionCard issueSeverity={issueSeverity} />
    </div>
  )
}
