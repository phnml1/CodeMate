"use client"

import { Fragment, useMemo } from "react"
import { MessageSquare, MessageSquarePlus } from "lucide-react"
import InlineCollaborationThread from "@/components/collaboration/InlineCollaborationThread"
import { DIFF_CODE_CLASS, DIFF_ROW_CLASS, DIFF_SYMBOL } from "@/constants/diff"
import type { DiffLine } from "@/lib/diff"
import type {
  CollaborationCodeSelection,
  CollaborationLocation,
  CollaborationTypingAnchor,
  CollaborationTypingEvent,
} from "@/lib/socket/types"
import type { CollaborationCodeAnchor, CollaborationCodeThreadSummary } from "@/types/collaboration"

type SharedLocation = CollaborationLocation & { userName: string }

interface CollaborationDiffViewerProps {
  lines: DiffLine[]
  filePath: string
  selection: CollaborationCodeSelection | null
  sharedLocations: SharedLocation[]
  typingUsers: CollaborationTypingEvent[]
  publishTyping: (anchor: CollaborationTypingAnchor | null, isTyping: boolean) => void
  onLineSelect: (side: "LEFT" | "RIGHT", line: number, extend: boolean) => void
  roomId: string
  currentUserId: string
  canSend: boolean
  threadSummaries: CollaborationCodeThreadSummary[]
  inlineThread: (CollaborationCodeAnchor & { focusComposer: boolean; displayIndex: number | null; targetMessageId: string | null }) | null
  onOpenThread: (side: "LEFT" | "RIGHT", startLine: number, endLine: number, focusComposer: boolean, displayIndex: number) => void
  onCloseThread: () => void
}

function includesLine(selection: CollaborationCodeSelection | null, line: DiffLine) {
  if (!selection) return false
  const number = selection.side === "LEFT" ? line.oldNum : line.newNum
  return number !== undefined && number >= selection.startLine && number <= selection.endLine
}

export default function CollaborationDiffViewer({
  lines,
  filePath,
  selection,
  sharedLocations,
  typingUsers,
  publishTyping,
  onLineSelect,
  roomId,
  currentUserId,
  canSend,
  threadSummaries,
  inlineThread,
  onOpenThread,
  onCloseThread,
}: CollaborationDiffViewerProps) {
  const threadCounts = useMemo(
    () => new Map(threadSummaries.map((thread) => [`${thread.side}:${thread.startLine}`, thread.count])),
    [threadSummaries]
  )

  return (
    <table aria-label={`${filePath} 변경 내용`} className="w-full min-w-max border-collapse font-mono text-xs leading-relaxed">
      <tbody>
        {lines.map((line, index) => {
          if (line.type === "hunk") {
            return (
              <tr key={index} className={DIFF_ROW_CLASS.hunk}>
                <td colSpan={5} className="px-3 py-1.5 text-left">{line.content}</td>
              </tr>
            )
          }

          const ownSelected = includesLine(selection, line)
          const othersSelected = sharedLocations.filter((location) =>
            includesLine(location.selection, line)
          )
          const viewers = sharedLocations.filter((location) =>
            location.line !== null &&
            (location.side === "LEFT" ? line.oldNum : line.newNum) === location.line
          )
          const codeSide = line.newNum !== undefined ? "RIGHT" : "LEFT"
          const codeLine = codeSide === "RIGHT" ? line.newNum : line.oldNum
          const textViewer = sharedLocations.find((location) => {
            const selected = location.textSelection
            return selected && selected.side === codeSide && codeLine !== undefined &&
              codeLine >= selected.startLine && codeLine <= selected.endLine
          })
          const textRange = textViewer?.textSelection
          const highlightStart = textRange && codeLine === textRange.startLine ? textRange.startOffset : 0
          const highlightEnd = textRange && codeLine === textRange.endLine ? textRange.endOffset : line.content.length
          const threads = ([
            line.oldNum === undefined ? null : { side: "LEFT" as const, number: line.oldNum },
            line.newNum === undefined ? null : { side: "RIGHT" as const, number: line.newNum },
          ]).flatMap((position) => {
            if (!position) return []
            const count = threadCounts.get(`${position.side}:${position.number}`)
            return count ? [{ ...position, count }] : []
          })
          const lineTypers = typingUsers.filter((user) => user.anchor &&
            (user.anchor.side === "LEFT" ? line.oldNum : line.newNum) === user.anchor.startLine
          )
          const selectedPosition = selection && includesLine(selection, line)
            ? { side: selection.side, startLine: selection.startLine, endLine: selection.endLine }
            : line.newNum !== undefined
              ? { side: "RIGHT" as const, startLine: line.newNum, endLine: line.newNum }
              : line.oldNum !== undefined
                ? { side: "LEFT" as const, startLine: line.oldNum, endLine: line.oldNum }
                : null
          const threadIsOpen = inlineThread && (
            inlineThread.displayIndex === index ||
            (inlineThread.displayIndex === null && (
              (inlineThread.side === "LEFT" && line.oldNum === inlineThread.startLine) ||
              (inlineThread.side === "RIGHT" && line.newNum === inlineThread.startLine)
            ))
          )
          const lineNumber = (side: "LEFT" | "RIGHT", number?: number) => (
            <td className="w-12 border-r border-slate-200 bg-slate-50/60 text-right dark:border-slate-800 dark:bg-slate-900/50">
              {number !== undefined && (
                <button
                  type="button"
                  data-diff-side={side}
                  data-diff-line={number}
                  aria-label={`${filePath} ${side === "LEFT" ? "이전" : "변경"} ${number}번 줄 선택`}
                  title="줄 선택 · Shift+클릭으로 범위 선택"
                  onClick={(event) => onLineSelect(side, number, event.shiftKey)}
                  className={`block w-full px-2 py-0.5 text-right hover:bg-emerald-100 dark:hover:bg-emerald-900/40 ${selection?.side === side && number >= selection.startLine && number <= selection.endLine ? "font-bold text-emerald-700 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400"}`}
                >
                  {number}
                </button>
              )}
            </td>
          )

          return (
            <Fragment key={index}>
              <tr
                className={`group ${DIFF_ROW_CLASS[line.type]} ${ownSelected ? "bg-emerald-100/80 dark:bg-emerald-900/30" : othersSelected.length ? "bg-sky-100/80 dark:bg-sky-900/30" : ""}`}
              >
                {lineNumber("LEFT", line.oldNum)}
                {lineNumber("RIGHT", line.newNum)}
                <td className="w-8 border-r border-slate-200 px-1 text-center dark:border-slate-800">
                  {viewers.length ? (
                    <span title={`${viewers.map((viewer) => viewer.userName).join(", ")}님이 보고 있습니다`} className="font-bold text-sky-700 dark:text-sky-300">●</span>
                  ) : DIFF_SYMBOL[line.type]}
                </td>
                <td className="w-20 border-r border-slate-200 px-1 dark:border-slate-800">
                  <div className="flex items-center justify-center gap-1">
                    {threads.map((thread) => (
                      <button
                        key={thread.side}
                        type="button"
                        title={`${thread.side === "LEFT" ? "이전" : "변경"} ${thread.number}번 줄 협업방 대화 ${thread.count}개`}
                        aria-label={`${thread.side === "LEFT" ? "이전" : "변경"} ${thread.number}번 줄 협업방 대화 ${thread.count}개 열기`}
                        onClick={() => onOpenThread(thread.side, thread.number, thread.number, false, index)}
                        className="inline-flex items-center gap-0.5 rounded-sm px-0.5 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
                      >
                        <MessageSquare className="size-3.5" /> {thread.count}
                      </button>
                    ))}
                    {lineTypers.length > 0 && (
                      <span title={`${lineTypers.map((user) => user.userName).join(", ")}님이 입력 중`} className="animate-pulse text-sky-700 dark:text-sky-300">•••</span>
                    )}
                    {selectedPosition && <button
                      type="button"
                      title="이 줄에 협업방 메시지 작성"
                      aria-label={`${selectedPosition.startLine}번 줄에 협업방 메시지 작성`}
                      disabled={!canSend}
                      onClick={() => onOpenThread(selectedPosition.side, selectedPosition.startLine, selectedPosition.endLine, true, index)}
                      className={`rounded-sm p-0.5 text-emerald-700 hover:bg-emerald-100 focus-visible:opacity-100 disabled:opacity-30 dark:text-emerald-300 dark:hover:bg-emerald-900/40 ${ownSelected || threads.length ? "opacity-100" : "xl:opacity-0 xl:group-hover:opacity-100"}`}
                    >
                      <MessageSquarePlus className="size-4" />
                    </button>}
                  </div>
                </td>
                <td data-code-side={codeLine === undefined ? undefined : codeSide} data-code-line={codeLine} className={`min-w-80 whitespace-pre px-4 py-0.5 ${DIFF_CODE_CLASS[line.type]}`}>
                  {textViewer && textRange && highlightEnd > highlightStart ? <>
                    {line.content.slice(0, highlightStart)}
                    <mark title={`${textViewer.userName}님이 선택한 텍스트`} className="bg-sky-300 text-slate-950 dark:bg-sky-500 dark:text-white">
                      {line.content.slice(highlightStart, highlightEnd)}
                    </mark>
                    {line.content.slice(highlightEnd)}
                  </> : line.content}
                </td>
              </tr>
              {threadIsOpen && (
                <tr>
                  <td colSpan={5} className="p-0">
                    <InlineCollaborationThread
                      key={`${filePath}:${inlineThread.side}:${inlineThread.startLine}`}
                      roomId={roomId}
                      anchor={inlineThread}
                      currentUserId={currentUserId}
                      canSend={canSend}
                      focusComposer={inlineThread.focusComposer}
                      targetMessageId={inlineThread.targetMessageId}
                      typingNames={typingUsers.filter((user) =>
                        user.anchor?.side === inlineThread.side && user.anchor.startLine === inlineThread.startLine
                      ).map((user) => user.userName)}
                      publishTyping={publishTyping}
                      onClose={onCloseThread}
                    />
                  </td>
                </tr>
              )}
            </Fragment>
          )
        })}
      </tbody>
    </table>
  )
}
