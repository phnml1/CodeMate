"use client"

import { Fragment, useState } from "react"
import { Plus } from "lucide-react"
import { DIFF_ROW_CLASS, DIFF_CODE_CLASS, DIFF_SYMBOL } from "@/constants/diff"
import { ISSUE_ROW_CLASS, ISSUE_INLINE_CLASS } from "@/constants/review"
import type { DiffLine } from "@/lib/diff"
import type { ReviewIssue } from "@/types/review"
import type { CommentWithAuthor } from "@/types/comment"
import { ISSUE_ICON } from "@/lib/review-ui"
import InlineCommentForm from "@/components/comment/InlineCommentForm"
import InlineCommentThread from "@/components/comment/InlineCommentThread"
import { useInlineTypingIndicator } from "@/hooks/useInlineTypingIndicator"

interface DiffTableProps {
  lines: DiffLine[]
  issues?: ReviewIssue[]
  onIssueClick?: (issue: ReviewIssue) => void
  inlineComments?: CommentWithAuthor[]
  prId?: string
  filePath?: string
  currentUserId?: string
}

export default function DiffTable({
  lines,
  issues = [],
  onIssueClick,
  inlineComments = [],
  prId,
  filePath,
  currentUserId = "",
}: DiffTableProps) {
  const [hoveredLine, setHoveredLine] = useState<number | null>(null)
  const [openFormLine, setOpenFormLine] = useState<number | null>(null)

  const { typingByLine } = useInlineTypingIndicator(prId ?? "")

  const issuesByLine = new Map<number, ReviewIssue[]>()
  for (const issue of issues) {
    if (issue.lineNumber != null) {
      const list = issuesByLine.get(issue.lineNumber) ?? []
      list.push(issue)
      issuesByLine.set(issue.lineNumber, list)
    }
  }

  const commentsByLine = new Map<number, CommentWithAuthor[]>()
  for (const comment of inlineComments) {
    if (comment.lineNumber != null) {
      const list = commentsByLine.get(comment.lineNumber) ?? []
      list.push(comment)
      commentsByLine.set(comment.lineNumber, list)
    }
  }

  const canAddInlineComment = !!(prId && filePath)

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
          const lineIssues = line.newNum != null ? (issuesByLine.get(line.newNum) ?? []) : []
          const topIssue = lineIssues[0]
          const lineComments = line.newNum != null ? (commentsByLine.get(line.newNum) ?? []) : []
          const isHovered = line.newNum != null && hoveredLine === line.newNum
          const isFormOpen = line.newNum != null && openFormLine === line.newNum

          return (
            <Fragment key={i}>
              <tr
                id={filePath && line.newNum != null ? `diff-line-${filePath}-${line.newNum}` : undefined}
                onMouseEnter={() => line.newNum != null && setHoveredLine(line.newNum)}
                onMouseLeave={() => setHoveredLine(null)}
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
                  {topIssue ? (
                    <button
                      type="button"
                      title={`${topIssue.title} — 자세히 보기`}
                      onClick={() => onIssueClick?.(topIssue)}
                      className="cursor-pointer hover:scale-125 transition-transform"
                    >
                      {ISSUE_ICON[topIssue.severity]}
                    </button>
                  ) : canAddInlineComment && (isHovered || isFormOpen) ? (
                    <button
                      type="button"
                      title="댓글 추가"
                      onClick={() => setOpenFormLine(isFormOpen ? null : line.newNum!)}
                      className="cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                    >
                      <Plus size={13} className="text-blue-500" />
                    </button>
                  ) : null}
                </td>
                <td className={`px-4 py-0.5 whitespace-pre overflow-visible ${DIFF_CODE_CLASS[line.type]}`}>
                  {line.content}
                </td>
              </tr>

              {lineComments.length > 0 && (
                <tr>
                  <td colSpan={5} className="p-0">
                    <InlineCommentThread
                      comments={lineComments}
                      currentUserId={currentUserId}
                      prId={prId!}
                    />
                  </td>
                </tr>
              )}

              {isFormOpen && canAddInlineComment && (
                <tr>
                  <td colSpan={5} className="p-0">
                    <InlineCommentForm
                      prId={prId!}
                      filePath={filePath!}
                      lineNumber={line.newNum!}
                      onClose={() => setOpenFormLine(null)}
                    />
                  </td>
                </tr>
              )}

              {(() => {
                if (!filePath || line.newNum == null) return null
                const lineKey = `${filePath}:${line.newNum}`
                const typingNames = typingByLine.get(lineKey)
                if (!typingNames?.length) return null
                const label = typingNames.length === 1
                  ? `${typingNames[0]}님이 입력 중`
                  : `${typingNames[0]} 외 ${typingNames.length - 1}명이 입력 중`
                return (
                  <tr>
                    <td colSpan={5} className="px-4 py-1 bg-blue-50 dark:bg-blue-950/20">
                      <span className="flex items-center gap-1.5 text-[10px] text-blue-500 dark:text-blue-400">
                        {label}
                        <span className="flex items-end gap-0.5">
                          <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
                        </span>
                      </span>
                    </td>
                  </tr>
                )
              })()}

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
            </Fragment>
          )
        })}
      </tbody>
    </table>
  )
}
