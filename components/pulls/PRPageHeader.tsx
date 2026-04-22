import { ChevronDown, GitPullRequest } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { controlStyles } from "@/lib/styles";
import { cn } from "@/lib/utils";

export default function PRPageHeader() {
  return (
    <PageHeader
      title="Pull Requests"
      description="저장소의 코드 변경 사항을 검토하고 병합을 관리하세요."
      actions={
        <>
        <Button
          variant="outline"
          className={cn("gap-2 px-4 py-2.5 text-sm", controlStyles.secondaryAction)}
        >
          <span>모든 저장소</span>
          <ChevronDown className="text-slate-400" size={16} aria-hidden />
        </Button>
        <Button className={cn("gap-2", controlStyles.primaryAction)}>
          <GitPullRequest size={18} aria-hidden />
          <span>새 PR 생성</span>
        </Button>
        </>
      }
    />
  );
}
