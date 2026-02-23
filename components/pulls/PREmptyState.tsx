import { GitPullRequest } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function PREmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
      <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8 border border-slate-100 shadow-inner">
        <GitPullRequest size={48} className="text-slate-200" aria-hidden />
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-3">
        아직 PR이 없습니다
      </h3>
      <p className="text-slate-500 text-sm max-w-sm mb-10 leading-relaxed font-medium">
        선택한 필터나 검색어에 맞는 Pull Request가 없습니다.
      </p>
      <Button className="px-8 py-3.5 bg-blue-700 text-white rounded-2xl text-sm font-bold hover:bg-blue-800 h-auto">
        저장소 연동하기
      </Button>
    </div>
  );
}
