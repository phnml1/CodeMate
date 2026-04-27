import { Loader2 } from "lucide-react";

export default function ReviewLoadingState() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
      <Loader2 size={18} className="animate-spin" />
      <span className="text-sm">리뷰 데이터를 불러오는 중입니다.</span>
    </div>
  );
}
