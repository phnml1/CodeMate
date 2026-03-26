import { Card } from "@/components/ui/card"

export default function CommentCardSkeleton() {
  return (
    <Card className="rounded-[24px] p-4 md:p-5 border-slate-200 shadow-none animate-pulse">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-200" />
            <div className="h-4 w-24 bg-slate-200 rounded" />
          </div>
          <div className="h-5 w-32 bg-slate-100 rounded-full" />
        </div>
        <div className="h-3 w-48 bg-slate-100 rounded" />
        <div className="space-y-1.5">
          <div className="h-3.5 w-full bg-slate-100 rounded" />
          <div className="h-3.5 w-4/5 bg-slate-100 rounded" />
        </div>
        <div className="h-3 w-20 bg-slate-100 rounded" />
      </div>
    </Card>
  )
}
