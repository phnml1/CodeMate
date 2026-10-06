import { Skeleton } from "@/components/ui/skeleton"

export default function CollaborationRoomLoading() {
  return (
    <div data-collaboration-loading="true" role="status" aria-label="협업방 화면 준비 중" className="flex h-dvh min-h-0 flex-col bg-white dark:bg-slate-950">
      <span className="sr-only">협업방 화면을 준비하는 중입니다.</span>
      <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-3 dark:border-slate-800 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="size-8 shrink-0" />
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-4 w-36 max-w-[50vw]" />
            <Skeleton className="h-3 w-56 max-w-[60vw]" />
          </div>
        </div>
        <Skeleton className="h-4 w-20 shrink-0" />
      </header>
      <div className="grid h-11 shrink-0 grid-cols-2 border-b border-slate-200 dark:border-slate-800 xl:hidden">
        <Skeleton className="m-auto h-4 w-12" />
        <Skeleton className="m-auto h-4 w-12" />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden min-h-0 border-r border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 xl:block">
          <Skeleton className="mb-5 h-4 w-24" />
          <div className="space-y-4">
            {Array.from({ length: 7 }, (_, index) => <Skeleton key={index} className="h-4 w-full" />)}
          </div>
        </aside>
        <section className="min-w-0 overflow-hidden" aria-label="PR 코드 준비 중">
          <div className="flex h-11 items-center border-b border-slate-200 px-4 dark:border-slate-800"><Skeleton className="h-4 w-40" /></div>
          <div className="space-y-3 p-4">
            {Array.from({ length: 12 }, (_, index) => <Skeleton key={index} className="h-4 w-full max-w-3xl" />)}
          </div>
        </section>
      </div>
    </div>
  )
}
