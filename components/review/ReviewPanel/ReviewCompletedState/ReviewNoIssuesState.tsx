import { CheckCircle } from "lucide-react";

export default function ReviewNoIssuesState() {
  return (
    <div className="flex flex-col items-center gap-2 py-8">
      <CheckCircle size={32} className="text-emerald-500" />
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
        발견된 이슈가 없습니다
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500">
        코드가 양호한 상태입니다.
      </p>
    </div>
  );
}
