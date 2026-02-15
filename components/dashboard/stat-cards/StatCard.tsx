import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  icon: LucideIcon
  value: string
  label: string
  badge: React.ReactNode
}

export default function StatCard({ icon: Icon, value, label, badge }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
      <div className="flex items-start justify-between mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-linear-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-slate-900 text-3xl sm:text-4xl md:text-5xl font-bold leading-none">{value}</div>
        <div className="text-slate-500 text-sm font-medium">{label}</div>
        <div className="mt-3">{badge}</div>
      </div>
    </div>
  )
}
