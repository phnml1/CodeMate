export default function PRListFooter() {
  return (
    <div className="py-12 border-t border-slate-50 flex flex-col items-center justify-center gap-3">
      <div className="flex flex-col items-center gap-2">
        <div className="w-1.5 h-1.5 bg-slate-200 rounded-full mb-2" />
        <span className="text-sm font-bold text-slate-300 uppercase tracking-widest">
          모든 PR을 확인했습니다
        </span>
      </div>
    </div>
  );
}
