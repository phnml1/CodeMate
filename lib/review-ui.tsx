import { CheckCircle, AlertTriangle, MessageSquare, AlertCircle, Info } from "lucide-react";
import type { AIReviewIssue } from "@/lib/ai/parsers";

// ─── ReviewPanel: 전체 평가 라벨 ─────────────────────────────────────────────

export interface AssessmentMeta {
  label: string;
  icon: React.ReactNode;
  color: string;
}

export const ASSESSMENT_LABEL: Record<string, AssessmentMeta> = {
  APPROVE: {
    label: "승인",
    icon: <CheckCircle size={14} />,
    color: "text-emerald-600 dark:text-emerald-400",
  },
  REQUEST_CHANGES: {
    label: "변경 요청",
    icon: <AlertTriangle size={14} />,
    color: "text-red-600 dark:text-red-400",
  },
  COMMENT: {
    label: "의견",
    icon: <MessageSquare size={14} />,
    color: "text-blue-600 dark:text-blue-400",
  },
};

// ─── DiffTable: 이슈 심각도 아이콘 ───────────────────────────────────────────

export const ISSUE_ICON: Record<AIReviewIssue["severity"], React.ReactNode> = {
  HIGH: <AlertCircle size={12} className="text-red-500 shrink-0" />,
  MEDIUM: <AlertTriangle size={12} className="text-yellow-500 shrink-0" />,
  LOW: <Info size={12} className="text-blue-500 shrink-0" />,
};
