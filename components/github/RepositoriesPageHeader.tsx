interface RepositoriesPageHeaderProps {
  connectedCount: number
}

export default function RepositoriesPageHeader({ connectedCount }: RepositoriesPageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          저장소
        </h1>
        <p className="text-sm text-slate-500 font-medium">
          GitHub 저장소를 연동하여 AI 코드 리뷰를 시작하세요.
        </p>
      </div>
      <div className="flex items-center">
        <div className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-full flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
          <span className="text-sm font-bold text-blue-700">{connectedCount}개 연동됨</span>
        </div>
      </div>
    </div>
  )
}
