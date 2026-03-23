import { textStyles } from "@/lib/styles"

interface CommentsHeaderProps {
  totalCount: number
  isLoading: boolean
}

export default function CommentsHeader({ totalCount, isLoading }: CommentsHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className={textStyles.pageTitle}>댓글</h1>
        <p className={textStyles.pageSubtitle}>
          모든 PR에 걸쳐 작성된 댓글을 한눈에 확인하세요.
        </p>
      </div>
      {!isLoading && totalCount > 0 && (
        <span className="px-3 py-1.5 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl self-start md:self-auto">
          총 {totalCount}개
        </span>
      )}
    </div>
  )
}
