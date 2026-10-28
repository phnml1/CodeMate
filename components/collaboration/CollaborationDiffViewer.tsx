"use client"

import { Fragment, useLayoutEffect, useMemo } from "react"
import { MessageSquare, MessageSquarePlus } from "lucide-react"
import InlineCollaborationThread from "@/components/collaboration/InlineCollaborationThread"
import { markCollaborationPerformance } from "@/lib/collaboration/client-performance"
import type { ParticipantColor } from "@/lib/collaboration/participant-colors"
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
type ColoredLocation = SharedLocation & { accent: ParticipantColor }

interface CollaborationDiffViewerProps {
  lines: DiffLine[]
  filePath: string
  selection: CollaborationCodeSelection | null
  sharedLocations: SharedLocation[]
  participantColors: Record<string, ParticipantColor>
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

function selectionBackground(colors: ParticipantColor[], fill: "fill" | "textFill" = "fill") {
  if (!colors.length) return undefined
  if (colors.length === 1) return `linear-gradient(${colors[0][fill]}, ${colors[0][fill]})`
  return `linear-gradient(to bottom, ${colors.flatMap((color, index) => [
    `${color[fill]} ${index / colors.length * 100}%`,
    `${color[fill]} ${(index + 1) / colors.length * 100}%`,
  ]).join(", ")})`
}

function renderCodeWithSelections(
  content: string,
  side: "LEFT" | "RIGHT",
  line: number | undefined,
  peers: ColoredLocation[]
) {
  if (line === undefined) return content

  const ranges = peers.flatMap((peer) => {
    const selection = peer.textSelection
    if (!selection || selection.side !== side || line < selection.startLine || line > selection.endLine) return []
    const start = Math.max(0, Math.min(content.length, line === selection.startLine ? selection.startOffset : 0))
    const end = Math.max(0, Math.min(content.length, line === selection.endLine ? selection.endOffset : content.length))
    return end > start ? [{ peer, start, end }] : []
  })
  if (!ranges.length) return content

  const boundaries = [...new Set([0, content.length, ...ranges.flatMap(({ start, end }) => [start, end])])].sort((a, b) => a - b)
  return boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1]
    const owners = ranges.filter((range) => range.start < end && range.end > start).map((range) => range.peer)
    const text = content.slice(start, end)
    if (!owners.length) return <Fragment key={start}>{text}</Fragment>

    return (
      <mark
        key={start}
        title={`${owners.map((owner) => owner.userName).join(", ")}님이 선택한 텍스트`}
        className="bg-transparent text-inherit"
        style={{ backgroundImage: selectionBackground(owners.map((owner) => owner.accent), "textFill") }}
      >
        {text}
      </mark>
    )
  })
}

export default function CollaborationDiffViewer({
  lines,
  filePath,
  selection,
  sharedLocations,
  participantColors,
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
  useLayoutEffect(() => {
    markCollaborationPerformance("diff.commit")
    let secondFrame = 0
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => markCollaborationPerformance("diff.paint-proxy"))
    })
    return () => {
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
    }
  }, [])
  const threadCounts = useMemo(
    () => new Map(threadSummaries.map((thread) => [`${thread.side}:${thread.startLine}`, thread.count])),
    [threadSummaries]
  )
  const peers = useMemo(
    () => [...sharedLocations]
      .sort((a, b) => a.userId.localeCompare(b.userId))
      .flatMap((location) => participantColors[location.userId]
        ? [{ ...location, accent: participantColors[location.userId] }]
        : []),
    [participantColors, sharedLocations]
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
          const othersSelected = peers.filter((location) =>
            includesLine(location.selection, line)
          )
          const selectedColors = [
            ...(ownSelected && participantColors[currentUserId] ? [participantColors[currentUserId]] : []),
            ...othersSelected.map((location) => location.accent),
          ]
          const viewers = peers.filter((location) =>
            location.line !== null &&
            (location.side === "LEFT" ? line.oldNum : line.newNum) === location.line
          )
          const codeSide = line.newNum !== undefined ? "RIGHT" : "LEFT"
          const codeLine = codeSide === "RIGHT" ? line.newNum : line.oldNum
          const textEnds = viewers.flatMap((viewer) =>
            viewer.textSelection?.side === codeSide && viewer.textSelection.endLine === codeLine
              ? [viewer.textSelection.endOffset]
              : []
          )
          const labelOffset = textEnds.length ? Math.min(...textEnds) : 0
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
          const lineNumberButton = (side: "LEFT" | "RIGHT", number: number, className = "") => (
            <button
              type="button"
              data-diff-side={side}
              data-diff-line={number}
              aria-label={`${filePath} ${side === "LEFT" ? "이전" : "변경"} ${number}번 줄 선택`}
              title="줄 선택 · Shift+클릭으로 범위 선택"
              onClick={(event) => onLineSelect(side, number, event.shiftKey)}
              className={`block w-full px-1 py-0.5 text-right hover:bg-slate-100 dark:hover:bg-slate-800 sm:px-2 ${selection?.side === side && number >= selection.startLine && number <= selection.endLine ? "font-bold" : "text-slate-500 dark:text-slate-400"} ${className}`}
              style={selection?.side === side && number >= selection.startLine && number <= selection.endLine ? { color: participantColors[currentUserId]?.solid } : undefined}
            >
              {number}
            </button>
          )
          const lineNumber = (side: "LEFT" | "RIGHT", number?: number, mobileFallback?: number) => (
            <td className={`${side === "LEFT" ? "hidden sm:table-cell" : ""} w-9 border-r border-slate-200 bg-slate-50/60 text-right dark:border-slate-800 dark:bg-slate-900/50 sm:w-12`}>
              {number !== undefined && lineNumberButton(side, number)}
              {number === undefined && mobileFallback !== undefined && lineNumberButton("LEFT", mobileFallback, "sm:hidden")}
            </td>
          )

          return (
            <Fragment key={index}>
              <tr className={`group ${DIFF_ROW_CLASS[line.type]}`} style={{ backgroundImage: selectionBackground(selectedColors) }}>
                {lineNumber("LEFT", line.oldNum)}
                {lineNumber("RIGHT", line.newNum, line.oldNum)}
                <td className="w-5 border-r border-slate-200 text-center dark:border-slate-800 sm:w-8 sm:px-1">
                  {viewers.length ? (
                    <span title={`${viewers.map((viewer) => viewer.userName).join(", ")}님이 보고 있습니다`} className="inline-flex items-center justify-center gap-px">
                      {viewers.map((viewer) => <span key={viewer.userId} className="size-1.5 rounded-full" style={{ backgroundColor: viewer.accent.solid }} />)}
                    </span>
                  ) : DIFF_SYMBOL[line.type]}
                </td>
                <td className="w-9 border-r border-slate-200 dark:border-slate-800 sm:w-20 sm:px-1">
                  <div className="relative flex flex-wrap items-center justify-center gap-0.5 sm:gap-1">
                    {threads.map((thread) => (
                      <button
                        key={thread.side}
                        type="button"
                        title={`${thread.side === "LEFT" ? "이전" : "변경"} ${thread.number}번 줄 리뷰방 대화 ${thread.count}개`}
                        aria-label={`${thread.side === "LEFT" ? "이전" : "변경"} ${thread.number}번 줄 리뷰방 대화 ${thread.count}개 열기`}
                        onClick={() => onOpenThread(thread.side, thread.number, thread.number, false, index)}
                        className="inline-flex items-center gap-0.5 rounded-sm px-0.5 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
                      >
                        <MessageSquare className="size-3.5" /> <span className="hidden sm:inline">{thread.count}</span>
                      </button>
                    ))}
                    {lineTypers.length > 0 && (
                      <span title={`${lineTypers.map((user) => user.userName).join(", ")}님이 입력 중`} className="animate-pulse text-sky-700 dark:text-sky-300">•••</span>
                    )}
                    {selectedPosition && <button
                      type="button"
                      title="이 줄에 리뷰방 메시지 작성"
                      aria-label={`${selectedPosition.startLine}번 줄에 리뷰방 메시지 작성`}
                      disabled={!canSend}
                      onClick={() => onOpenThread(selectedPosition.side, selectedPosition.startLine, selectedPosition.endLine, true, index)}
                      className={`rounded-sm p-0.5 text-emerald-700 hover:bg-emerald-100 focus-visible:opacity-100 disabled:opacity-30 dark:text-emerald-300 dark:hover:bg-emerald-900/40 ${ownSelected || threads.length ? "opacity-100" : "xl:opacity-0 xl:group-hover:opacity-100"}`}
                    >
                      <MessageSquarePlus className="size-4" />
                    </button>}
                    {viewers.length > 0 && (
                      <span
                        data-remote-location-labels
                        title={`${viewers.map((viewer) => viewer.userName).join(", ")}님이 보고 있습니다`}
                        className="pointer-events-none absolute top-0 z-20 flex max-w-[min(16rem,45cqw)] -translate-y-full flex-wrap gap-0.5 rounded-sm border border-slate-200 bg-white/95 p-0.5 font-sans text-[10px] leading-4 shadow-sm select-none dark:border-slate-700 dark:bg-slate-950/95"
                        style={{ left: `calc(100% + 0.5rem + min(${labelOffset}ch, 25cqw))` }}
                      >
                        {viewers.map((viewer) => (
                          <span key={viewer.userId} className="inline-flex min-w-0 max-w-24 items-center rounded-sm px-1.5 font-medium text-white" style={{ backgroundColor: viewer.accent.solid }}>
                            <span className="truncate">{viewer.userName}</span>
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                </td>
                <td data-code-side={codeLine === undefined ? undefined : codeSide} data-code-line={codeLine} title={othersSelected.length ? `${othersSelected.map((location) => location.userName).join(", ")}님이 선택 중` : undefined} className={`min-w-40 whitespace-pre px-2 py-0.5 sm:min-w-80 sm:px-4 ${DIFF_CODE_CLASS[line.type]}`} style={{ backgroundImage: selectionBackground(selectedColors), boxShadow: selectedColors.length === 1 ? `inset 3px 0 ${selectedColors[0].solid}` : undefined }}>
                  {renderCodeWithSelections(line.content, codeSide, codeLine, peers)}
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
