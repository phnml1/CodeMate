import { PageHeader } from "@/components/layout/PageHeader"

interface CommentsHeaderProps {
  totalCount: number
  isLoading: boolean
}

export default function CommentsHeader({ totalCount, isLoading }: CommentsHeaderProps) {
  return (
    <PageHeader
      title="댓글"
      description="모든 PR에 걸쳐 작성된 댓글을 한눈에 확인하세요."
      actions={
        !isLoading && totalCount > 0 ? (
          <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600">
            총 {totalCount}개
          </span>
        ) : null
      }
    />
  )
}
