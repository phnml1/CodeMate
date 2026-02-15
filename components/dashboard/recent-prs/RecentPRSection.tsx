import RecentPRTable from "./RecentPRTable"

export default function RecentPRSection() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 sm:p-6 md:p-8 border-b border-slate-200">
        <h3 className="text-slate-900 text-base sm:text-lg font-bold">
          최근 Pull Requests
        </h3>
      </div>
      <RecentPRTable />
    </div>
  )
}
