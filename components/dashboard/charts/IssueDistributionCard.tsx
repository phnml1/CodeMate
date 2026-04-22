import { type IssueSeverityItem } from "@/lib/dashboard"
import IssueDistributionChart from "./IssueDistributionChart"
import { surfaceStyles, textStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"

export default function IssueDistributionCard({
  issueSeverity,
}: {
  issueSeverity: IssueSeverityItem[]
}) {
  return (
    <div className={cn("lg:col-span-2", surfaceStyles.panel, surfaceStyles.panelPadding)}>
      <h3 className={`${textStyles.sectionTitle} mb-4 sm:mb-6`}>이슈 분포</h3>
      <IssueDistributionChart data={issueSeverity} />
    </div>
  )
}
