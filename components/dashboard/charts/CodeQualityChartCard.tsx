import { type QualityTrendItem } from "@/lib/dashboard"
import CodeQualityChart from "./CodeQualityChart"
import { surfaceStyles, textStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"

export default function CodeQualityChartCard({
  qualityTrend,
}: {
  qualityTrend: QualityTrendItem[]
}) {
  return (
    <div className={cn("lg:col-span-3", surfaceStyles.panel, surfaceStyles.panelPadding)}>
      <h3 className={`${textStyles.sectionTitle} mb-4 sm:mb-6`}>
        코드 품질 추이 (최근 30일)
      </h3>
      <div className="h-[280px] w-full sm:h-[340px]">
        <CodeQualityChart data={qualityTrend} />
      </div>
    </div>
  )
}
