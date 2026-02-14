import CodeQualityChart from "./CodeQualityChart"

export default function CodeQualityChartCard() {
  return (
    <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 md:p-8">
      <h3 className="text-slate-900 text-base sm:text-lg font-bold mb-4 sm:mb-6">
        코드 품질 추이 (최근 30일)
      </h3>
      <div className="w-full h-70 sm:h-85">
        <CodeQualityChart />
      </div>
    </div>
  )
}
