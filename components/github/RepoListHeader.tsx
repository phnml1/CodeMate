interface RepoListHeaderProps {
  count: number;
}

export default function RepoListHeader({ count }: RepoListHeaderProps) {
  return (
    <div className="flex items-center justify-between px-2">
      <h2 className="text-lg font-bold text-slate-900">저장소 목록</h2>
      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
        {count} Repositories Found
      </span>
    </div>
  );
}
