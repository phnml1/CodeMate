import IssueDistributionChart from "./IssueDistributionChart"

export default function IssueDistributionCard() {
  return (
    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 md:p-8">
      <h3 className="text-slate-900 text-base sm:text-lg font-bold mb-4 sm:mb-6">이슈 분포</h3>
      <IssueDistributionChart />
    </div>
  )
}
