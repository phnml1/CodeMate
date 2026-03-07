import { DIFF_ROW_CLASS, DIFF_CODE_CLASS, DIFF_SYMBOL } from "@/constants/diff";
import { ISSUE_ROW_CLASS, ISSUE_INLINE_CLASS } from "@/constants/review";
import type { DiffLine } from "@/lib/diff";
import type { ReviewIssue } from "@/types/review";
import { ISSUE_ICON } from "@/lib/review-ui";

interface DiffTableProps {
  lines: DiffLine[];
  issues?: ReviewIssue[];
  onIssueClick?: (issue: ReviewIssue) => void;
}

export default function DiffTable({ lines, issues = [], onIssueClick }: DiffTableProps) {
  const issuesByLine = new Map<number, ReviewIssue[]>();
  for (const issue of issues) {
    if (issue.lineNumber != null) {
      const list = issuesByLine.get(issue.lineNumber) ?? [];
      list.push(issue);
      issuesByLine.set(issue.lineNumber, list);
    }
  }

  return (
    <table aria-label="파일 변경 내용" className="w-full border-collapse font-mono text-[11px] md:text-xs leading-relaxed table-fixed min-w-full">
      <colgroup>
        <col className="w-10" />
        <col className="w-10" />
        <col className="w-6" />
        <col className="w-6" />
        <col />
      </colgroup>
      <tbody>
        {lines.map((line, i) => {
          const lineIssues = line.newNum != null ? (issuesByLine.get(line.newNum) ?? []) : [];
          const topIssue = lineIssues[0];

          return (
            <>
              <tr
                key={i}
                className={`${DIFF_ROW_CLASS[line.type]} hover:brightness-95 dark:hover:brightness-110 transition-all ${topIssue ? ISSUE_ROW_CLASS[topIssue.severity] : ""}`}
              >
                <td className="px-2 py-0.5 text-right border-r border-slate-200 dark:border-slate-800 select-none opacity-40 text-[10px] bg-slate-50/50 dark:bg-slate-800/30">
                  {line.oldNum ?? ""}
                </td>
                <td className="px-2 py-0.5 text-right border-r border-slate-200 dark:border-slate-800 select-none opacity-40 text-[10px] bg-slate-50/50 dark:bg-slate-800/30">
                  {line.newNum ?? ""}
                </td>
                <td className="px-2 py-0.5 text-center border-r border-slate-200 dark:border-slate-800 select-none opacity-60 font-black">
                  {DIFF_SYMBOL[line.type]}
                </td>
                <td className="px-1 py-0.5 text-center border-r border-slate-200 dark:border-slate-800 select-none">
                  {topIssue && (
                    <button
                      type="button"
                      title={`${topIssue.title} — 자세히 보기`}
                      onClick={() => onIssueClick?.(topIssue)}
                      className="cursor-pointer hover:scale-125 transition-transform"
                    >
                      {ISSUE_ICON[topIssue.severity]}
                    </button>
                  )}
                </td>
                <td className={`px-4 py-0.5 whitespace-pre overflow-visible ${DIFF_CODE_CLASS[line.type]}`}>
                  {line.content}
                </td>
              </tr>
              {lineIssues.map((issue, j) => (
                <tr key={`issue-${i}-${j}`}>
                  <td colSpan={5} className="px-4 py-0">
                    <button
                      type="button"
                      onClick={() => onIssueClick?.(issue)}
                      className={`w-full text-left mx-1 my-0.5 px-3 py-1.5 rounded-lg text-[11px] leading-relaxed border-l-2 hover:brightness-95 dark:hover:brightness-125 transition-all cursor-pointer ${ISSUE_INLINE_CLASS[issue.severity]}`}
                    >
                      <span className="font-semibold">{issue.title}</span>
                      <span className="opacity-75"> — {issue.description}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </>
          );
        })}
      </tbody>
    </table>
  );
}
