import { Button } from "@/components/ui/button";
import { textStyles } from "@/lib/styles";
import PRStatusFilter from "@/components/pulls/PRStatusFilter";
import PRList from "@/components/pulls/PRList";
import { ChevronDown, GitPullRequest } from "lucide-react";

export default function Page() {
  return (<div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className={textStyles.pageTitle}>Pull Requests</h1>
        <p className={textStyles.pageSubtitle}>저장소의 코드 변경 사항을 검토하고 병합을 관리하세요.</p>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:border-slate-300 transition-all shadow-sm">
          <span>모든 저장소</span>
          <ChevronDown className="text-slate-400" size={16} aria-hidden />
        </Button>
        <Button className="bg-blue-700 hover:bg-blue-800 rounded-xl font-bold shadow-lg shadow-blue-700/20 flex items-center gap-2">
          <GitPullRequest size={18} aria-hidden />
          <span>새 PR 생성</span>
        </Button>
      </div>
    </div>
    <div className="bg-white border border-slate-200 p-2 rounded-[24px] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-sm">
      <PRStatusFilter />
    </div>
    <PRList />
  </div>)
}