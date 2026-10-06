"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Bell,
  Code2,
  Eye,
  EyeOff,
  FileCode2,
  Loader2,
  LocateFixed,
  MessageSquare,
  RefreshCw,
  Users,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import CollaborationMessages from "@/components/collaboration/CollaborationMessages"
import CollaborationDiffViewer from "@/components/collaboration/CollaborationDiffViewer"
import CollaborationCodeLink from "@/components/collaboration/CollaborationCodeLink"
import FileIcon from "@/components/pulls/detail/FileIcon"
import { PR_FILE_STATUS_BADGE } from "@/constants/pulls"
import { useCollaborationRoomSocket } from "@/hooks/useCollaborationRoomSocket"
import { useCollaborationCodeThreads } from "@/hooks/useCollaborationCodeThreads"
import { useCollaborationMessages } from "@/hooks/useCollaborationMessages"
import { useWorkspacePRFiles } from "@/hooks/usePRFiles"
import { parsePatch } from "@/lib/diff"
import type { CollaborationLocation, CollaborationTextSelection, CollaborationViewport } from "@/lib/socket/types"
import type { CollaborationCodeAnchor, CollaborationCodeReference, CollaborationMessage, CollaborationRoom } from "@/types/collaboration"
import type { PRFile } from "@/types/pulls"

type MobilePanel = "files" | "code"
type CodePosition = Pick<CollaborationLocation, "filePath" | "side" | "line"> &
  Partial<Pick<CollaborationLocation, "baseSha" | "headSha" | "viewport">>
const EMPTY_FILES: PRFile[] = []

function readViewport(pane: HTMLDivElement | null, lineButton?: HTMLButtonElement): CollaborationViewport | undefined {
  if (!pane) return undefined
  const clamp = (value: number) => Math.max(0, Math.min(1, value))
  return {
    top: clamp(pane.scrollTop / Math.max(1, pane.scrollHeight - pane.clientHeight)),
    left: clamp(pane.scrollLeft / Math.max(1, pane.scrollWidth - pane.clientWidth)),
    ...(lineButton ? { lineOffset: Math.max(-10_000, Math.min(10_000, lineButton.getBoundingClientRect().top - pane.getBoundingClientRect().top)) } : {}),
  }
}

function readTextSelection(pane: HTMLDivElement): CollaborationTextSelection | null {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || !selection.rangeCount) return null
  const range = selection.getRangeAt(0)
  const codeCell = (node: Node) =>
    (node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement)
      ?.closest<HTMLElement>("td[data-code-line]")
  const startCell = codeCell(range.startContainer)
  const endCell = codeCell(range.endContainer)
  if (!startCell || !endCell || !pane.contains(startCell) || !pane.contains(endCell)) return null
  if (startCell.dataset.codeSide !== endCell.dataset.codeSide) return null
  const startLine = Number(startCell.dataset.codeLine)
  const endLine = Number(endCell.dataset.codeLine)
  if (!Number.isInteger(startLine) || !Number.isInteger(endLine) || startLine > endLine) return null
  const offsetInCell = (cell: HTMLElement, node: Node, offset: number) => {
    const prefix = document.createRange()
    prefix.selectNodeContents(cell)
    prefix.setEnd(node, offset)
    return prefix.toString().length
  }
  const startOffset = offsetInCell(startCell, range.startContainer, range.startOffset)
  const endOffset = offsetInCell(endCell, range.endContainer, range.endOffset)
  if (startLine === endLine && startOffset >= endOffset) return null
  return {
    side: startCell.dataset.codeSide === "LEFT" ? "LEFT" : "RIGHT",
    startLine,
    endLine,
    startOffset,
    endOffset,
  }
}

function connectionLabel(status: string) {
  switch (status) {
    case "connected": return "연결됨"
    case "connecting": return "연결 중"
    case "reconnecting": return "재연결 중"
    case "error": return "연결 오류"
    default: return "연결 대기"
  }
}

export default function CollaborationWorkspaceClient({
  room,
  currentUserId,
}: {
  room: CollaborationRoom
  currentUserId: string
}) {
  const router = useRouter()
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("code")
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [selection, setSelection] = useState<CollaborationCodeReference | null>(null)
  const [textSelection, setTextSelection] = useState<(CollaborationTextSelection & { filePath: string }) | null>(null)
  const [codeMessageNotice, setCodeMessageNotice] = useState<{ message: CollaborationMessage; count: number } | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [unreadChatCount, setUnreadChatCount] = useState(0)
  const [chatMessageNotice, setChatMessageNotice] = useState<CollaborationMessage | null>(null)
  const [followUserId, setFollowUserId] = useState<string | null>(null)
  const [pendingJump, setPendingJump] = useState<CodePosition | null>(null)
  const [navigationError, setNavigationError] = useState<string | null>(null)
  const [inlineThread, setInlineThread] = useState<(CollaborationCodeAnchor & { focusComposer: boolean; displayIndex: number | null; targetMessageId: string | null }) | null>(null)
  const codeScrollRef = useRef<HTMLDivElement>(null)
  const scrollTimerRef = useRef<number | null>(null)
  const selectionAnchorRef = useRef<{ filePath: string; side: "LEFT" | "RIGHT"; line: number } | null>(null)
  const knownMessageIdsRef = useRef<Set<string>>(new Set())
  const messageHistoryReadyRef = useRef(false)
  const chatOpenRef = useRef(false)
  const leavingRef = useRef(false)
  const openChat = () => {
    chatOpenRef.current = true
    setChatOpen(true)
    setUnreadChatCount(0)
    setChatMessageNotice(null)
    setCodeMessageNotice(null)
  }
  const closeChat = () => {
    chatOpenRef.current = false
    setChatOpen(false)
  }
  const handleIncomingMessage = useCallback((message: CollaborationMessage) => {
    if (message.roomId !== room.id || knownMessageIdsRef.current.has(message.id)) return
    knownMessageIdsRef.current.add(message.id)
    if (message.authorId === currentUserId) return
    const reference = message.codeReference
    const visibleInlineThread = mobilePanel === "code" && reference && inlineThread &&
      reference.filePath === inlineThread.filePath && reference.side === inlineThread.side &&
      reference.startLine === inlineThread.startLine && reference.endLine === inlineThread.endLine &&
      reference.baseSha === inlineThread.baseSha && reference.headSha === inlineThread.headSha
    if (document.visibilityState === "visible" && (chatOpenRef.current || visibleInlineThread)) return
    setUnreadChatCount((current) => current + 1)
    setChatMessageNotice(message)
    if (message.codeReference) {
      setCodeMessageNotice((current) => ({ message, count: (current?.count ?? 0) + 1 }))
    }
  }, [currentUserId, inlineThread, mobilePanel, room.id])
  const { data: fileData, isPending: filesPending, isError: filesError } =
    useWorkspacePRFiles(room.pullRequestId)
  const files = fileData?.files ?? EMPTY_FILES
  const revision = fileData?.revision
  const { activeRoomId, error, joinRoom, leaveOnUnload, leaveRoom, locations, presence, publishLocation, publishTyping, status, stopSharingLocation, typingUsers } =
    useCollaborationRoomSocket(handleIncomingMessage)

  const leaveForPullRequest = useCallback(() => {
    if (leavingRef.current || !window.confirm("협업방에서 나가시겠습니까?")) return
    leavingRef.current = true
    leaveRoom()
    router.replace(`/pulls/${room.pullRequestId}`)
  }, [leaveRoom, room.pullRequestId, router])

  useEffect(() => {
    const guardKey = `collaboration:${room.id}`
    const pushGuard = () => {
      if (window.history.state?.collaborationRoomGuard !== guardKey) {
        window.history.pushState({ ...window.history.state, collaborationRoomGuard: guardKey }, "", window.location.href)
      }
    }
    pushGuard()
    const onPopState = () => {
      if (leavingRef.current) return
      if (!window.confirm("협업방에서 나가시겠습니까?")) {
        pushGuard()
        return
      }
      leavingRef.current = true
      leaveRoom()
      window.history.back()
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (leavingRef.current) return
      event.preventDefault()
      event.returnValue = true
    }
    const onPageHide = () => leaveOnUnload()
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return
      leavingRef.current = false
      pushGuard()
      if (room.status === "ACTIVE") void joinRoom(room.id).catch(() => {})
    }
    window.addEventListener("popstate", onPopState)
    window.addEventListener("beforeunload", onBeforeUnload)
    window.addEventListener("pagehide", onPageHide)
    window.addEventListener("pageshow", onPageShow)
    return () => {
      window.removeEventListener("popstate", onPopState)
      window.removeEventListener("beforeunload", onBeforeUnload)
      window.removeEventListener("pagehide", onPageHide)
      window.removeEventListener("pageshow", onPageShow)
    }
  }, [joinRoom, leaveOnUnload, leaveRoom, room.id, room.status])

  useEffect(() => {
    if (room.status === "ACTIVE") {
      void joinRoom(room.id).catch(() => {})
    }
  }, [joinRoom, room.id, room.status])

  const selectedFile =
    files.find((file) => file.filename === selectedFileName) ?? files[0]
  const lines = useMemo(
    () => selectedFile?.patch ? parsePatch(selectedFile.patch) : [],
    [selectedFile]
  )
  const connected = status === "connected" && activeRoomId === room.id
  const participants = connected ? presence?.users ?? [] : []
  const onlineParticipantCount = participants.filter((user) => user.status === "online").length
  const messagesQuery = useCollaborationMessages(room.id, connected)
  const messages = useMemo(
    () => messagesQuery.data?.pages.slice().reverse().flatMap((page) => page.messages) ?? [],
    [messagesQuery.data]
  )
  useEffect(() => {
    const latestPage = messagesQuery.data?.pages[0]
    if (!latestPage) return
    if (!messageHistoryReadyRef.current) {
      latestPage.messages.forEach((message) => knownMessageIdsRef.current.add(message.id))
      messageHistoryReadyRef.current = true
      return
    }
    latestPage.messages.forEach(handleIncomingMessage)
  }, [handleIncomingMessage, messagesQuery.data])
  const currentFileAnchor = selectedFile && revision
    ? { filePath: selectedFile.filename, ...revision }
    : null
  const threadsQuery = useCollaborationCodeThreads(room.id, currentFileAnchor)
  const activeSelection = selection?.baseSha === revision?.baseSha &&
    selection?.headSha === revision?.headSha ? selection : null
  const followedLocation = followUserId ? locations[followUserId] : null
  const sharedLocations = participants.flatMap((user) => {
    const location = locations[user.userId]
    return location && user.userId !== currentUserId
      ? [{ ...location, userName: user.userName }]
      : []
  }).filter((location) =>
    location.filePath === selectedFile?.filename &&
    location.baseSha === revision?.baseSha &&
    location.headSha === revision?.headSha
  )
  const activeTypingUsers = Object.values(typingUsers).filter((user) =>
    user.anchor?.filePath === selectedFile?.filename &&
    user.anchor.baseSha === revision?.baseSha &&
    user.anchor.headSha === revision?.headSha
  )

  const publishVisibleLocation = useCallback(() => {
    if (!connected || followUserId || !selectedFile || !revision) return
    const pane = codeScrollRef.current
    if (!pane) return
    const viewportTop = pane.getBoundingClientRect().top
    const viewportBottom = pane.getBoundingClientRect().bottom
    const visibleButton = (["RIGHT", "LEFT"] as const).flatMap((side) =>
      [...pane.querySelectorAll<HTMLButtonElement>(`button[data-diff-side="${side}"]`)]
        .filter((button) => {
          const rect = button.getBoundingClientRect()
          return rect.bottom > viewportTop + 2 && rect.top < viewportBottom
        })
        .slice(0, 1)
    )[0]
    publishLocation({
      filePath: selectedFile.filename,
      baseSha: revision.baseSha,
      headSha: revision.headSha,
      side: visibleButton?.dataset.diffSide === "LEFT" ? "LEFT" : "RIGHT",
      line: visibleButton ? Number(visibleButton.dataset.diffLine) : null,
      selection: activeSelection?.filePath === selectedFile.filename ? activeSelection : null,
      textSelection: textSelection?.filePath === selectedFile.filename ? textSelection : null,
      viewport: readViewport(pane, visibleButton),
    })
  }, [activeSelection, connected, followUserId, publishLocation, revision, selectedFile, textSelection])

  useEffect(() => {
    const timer = window.setTimeout(publishVisibleLocation, 0)
    return () => window.clearTimeout(timer)
  }, [publishVisibleLocation])

  useEffect(() => {
    if (connected && followUserId) stopSharingLocation()
  }, [connected, followUserId, stopSharingLocation])

  useEffect(() => () => {
    if (scrollTimerRef.current !== null) window.clearTimeout(scrollTimerRef.current)
  }, [])

  useEffect(() => {
    const location = followedLocation
    if (!location) return
    const timer = window.setTimeout(() => {
      if (filesPending) return
      if (location.baseSha !== revision?.baseSha || location.headSha !== revision?.headSha) {
        setNavigationError("상대방과 PR 코드 버전이 다릅니다. 화면을 새로고침해 주세요.")
        return
      }
      if (!files.some((file) => file.filename === location.filePath)) {
        setNavigationError("현재 PR diff에서 해당 파일을 찾을 수 없습니다.")
        return
      }
      setNavigationError(null)
      setSelectedFileName(location.filePath)
      setMobilePanel("code")
      setPendingJump(location)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [files, filesPending, followedLocation, revision])

  useEffect(() => {
    if (!pendingJump || !selectedFile || pendingJump.filePath !== selectedFile.filename || mobilePanel !== "code") return
    const timer = window.requestAnimationFrame(() => {
      const pane = codeScrollRef.current
      if (!pane) {
        setPendingJump(null)
        return
      }
      if (pendingJump.viewport) {
        const button = pendingJump.line === null ? null :
          [...pane.querySelectorAll<HTMLButtonElement>(`button[data-diff-side="${pendingJump.side}"]`)]
            .find((item) => Number(item.dataset.diffLine) === pendingJump.line)
        const anchorTop = button && pendingJump.viewport.lineOffset !== undefined
          ? pane.scrollTop + button.getBoundingClientRect().top - pane.getBoundingClientRect().top - pendingJump.viewport.lineOffset
          : pendingJump.viewport.top * Math.max(0, pane.scrollHeight - pane.clientHeight)
        pane.scrollTo({
          top: anchorTop,
          left: pendingJump.viewport.left * Math.max(0, pane.scrollWidth - pane.clientWidth),
          behavior: "auto",
        })
      } else if (pendingJump.line !== null) {
        const button = [...pane.querySelectorAll<HTMLButtonElement>(`button[data-diff-side="${pendingJump.side}"]`)]
          .find((item) => Number(item.dataset.diffLine) === pendingJump.line)
        if (button) {
          const paneTop = pane.getBoundingClientRect().top
          const buttonTop = button.getBoundingClientRect().top
          pane.scrollTo({ top: pane.scrollTop + buttonTop - paneTop - pane.clientHeight / 3, behavior: "auto" })
        } else {
          setNavigationError("이 줄은 현재 PR diff에 표시되지 않습니다.")
        }
      }
      if (inlineThread?.filePath === pendingJump.filePath && inlineThread.side === pendingJump.side && inlineThread.startLine === pendingJump.line) {
        const thread = pane.querySelector<HTMLElement>("[data-collaboration-thread]")
        const target = [...(thread?.querySelectorAll<HTMLElement>("[data-collaboration-message-id]") ?? [])]
          .find((item) => item.dataset.collaborationMessageId === inlineThread.targetMessageId)
        ;(target ?? thread)?.scrollIntoView({ block: "nearest", inline: "nearest" })
      }
      setPendingJump(null)
    })
    return () => window.cancelAnimationFrame(timer)
  }, [inlineThread, mobilePanel, pendingJump, selectedFile])

  const selectFile = (filePath: string) => {
    setFollowUserId(null)
    setSelection(null)
    setTextSelection(null)
    setInlineThread(null)
    selectionAnchorRef.current = null
    setSelectedFileName(filePath)
    codeScrollRef.current?.scrollTo({ top: 0 })
    setMobilePanel("code")
    setNavigationError(null)
  }

  const selectLine = (side: "LEFT" | "RIGHT", line: number, extend: boolean) => {
    if (!selectedFile || !revision) return
    const previousAnchor = selectionAnchorRef.current
    const anchor = extend && activeSelection && previousAnchor?.filePath === selectedFile.filename && previousAnchor.side === side
      ? previousAnchor.line
      : line
    if (!extend || anchor === line) {
      selectionAnchorRef.current = { filePath: selectedFile.filename, side, line }
    }
    const nextSelection: CollaborationCodeReference = {
      filePath: selectedFile.filename,
      baseSha: revision.baseSha,
      headSha: revision.headSha,
      side,
      startLine: Math.min(anchor, line),
      endLine: Math.max(anchor, line),
    }
    setFollowUserId(null)
    setSelection(nextSelection)
    setTextSelection(null)
    setNavigationError(null)
    publishLocation({ filePath: selectedFile.filename, ...revision, side, line, selection: nextSelection, textSelection: null, viewport: readViewport(codeScrollRef.current) })
  }

  const selectCodeText = () => {
    const pane = codeScrollRef.current
    if (!pane || !selectedFile || !revision) return
    const selectedText = readTextSelection(pane)
    if (!selectedText) {
      if (textSelection) {
        setTextSelection(null)
        setSelection(null)
        selectionAnchorRef.current = null
      }
      return
    }
    setFollowUserId(null)
    setTextSelection({ ...selectedText, filePath: selectedFile.filename })
    setSelection({ filePath: selectedFile.filename, ...revision, side: selectedText.side, startLine: selectedText.startLine, endLine: selectedText.endLine })
    selectionAnchorRef.current = null
    setNavigationError(null)
  }

  useEffect(() => {
    if (!textSelection) return
    const clearCollapsedSelection = () => {
      if (!window.getSelection()?.isCollapsed) return
      setTextSelection(null)
      setSelection(null)
      selectionAnchorRef.current = null
    }
    document.addEventListener("selectionchange", clearCollapsedSelection)
    return () => document.removeEventListener("selectionchange", clearCollapsedSelection)
  }, [textSelection])

  const moveToLocation = (location: CodePosition) => {
    if (revision && (
      (location.headSha && location.headSha !== revision.headSha) ||
      (location.baseSha && location.baseSha !== revision.baseSha)
    )) {
      setNavigationError("이 위치는 현재 PR 코드와 버전이 다릅니다. 화면을 새로고침해 주세요.")
      return false
    }
    if (!files.some((file) => file.filename === location.filePath)) {
      setNavigationError("현재 PR diff에서 해당 파일을 찾을 수 없습니다.")
      return false
    }
    setNavigationError(null)
    setSelectedFileName(location.filePath)
    setMobilePanel("code")
    setPendingJump(location)
    return true
  }

  const openCodeReference = (reference: CollaborationCodeReference, messageId?: string) => {
    if (!moveToLocation({ filePath: reference.filePath, side: reference.side, line: reference.startLine, baseSha: reference.baseSha ?? undefined, headSha: reference.headSha ?? undefined })) return
    closeChat()
    if (messageId) {
      setCodeMessageNotice((current) => current?.message.id === messageId ? null : current)
      if (chatMessageNotice?.id === messageId) {
        setChatMessageNotice(null)
        setUnreadChatCount((current) => Math.max(0, current - 1))
      }
    }
    setFollowUserId(null)
    setTextSelection(null)
    selectionAnchorRef.current = { filePath: reference.filePath, side: reference.side, line: reference.startLine }
    setSelection({ ...reference, ...(revision ?? {}) })
    if (revision) {
      setInlineThread({
        filePath: reference.filePath,
        side: reference.side,
        startLine: reference.startLine,
        endLine: reference.endLine,
        ...revision,
        focusComposer: false,
        displayIndex: null,
        targetMessageId: messageId ?? null,
      })
    }
  }

  const openInlineThread = (
    side: "LEFT" | "RIGHT",
    startLine: number,
    endLine: number,
    focusComposer: boolean,
    displayIndex: number
  ) => {
    if (!selectedFile || !revision) return
    const anchor: CollaborationCodeAnchor = {
      filePath: selectedFile.filename,
      ...revision,
      side,
      startLine,
      endLine,
    }
    setFollowUserId(null)
    setTextSelection(null)
    setSelection(anchor)
    setInlineThread({ ...anchor, focusComposer, displayIndex, targetMessageId: null })
    setNavigationError(null)
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="shrink-0 border-b border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950 sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button type="button" variant="ghost" size="icon-sm" title="PR 상세로 돌아가기" aria-label="PR 상세로 돌아가기" onClick={leaveForPullRequest}>
              <ArrowLeft />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold sm:text-base">{room.name}</h1>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {room.pullRequest.repo.fullName} · #{room.pullRequest.number} {room.pullRequest.title}
              </p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
              connected ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
            }`}>
              <span className={`size-2 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`} />
              {room.status === "ENDED" ? "종료된 방" : connectionLabel(status)}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
              <Users className="size-3.5" />
              {connected && presence ? onlineParticipantCount : "—"}/{room.capacity}
            </span>
          </div>
        </div>
        {participants.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 pl-10 text-xs text-slate-600 dark:text-slate-300">
            {participants.map((user) => {
              const location = locations[user.userId]
              const isMe = user.userId === currentUserId
              const following = followUserId === user.userId
              return (
                <div key={user.userId} className="flex min-w-0 max-w-full items-center gap-1.5 border border-slate-200 px-2 py-1 dark:border-slate-700">
                  <span className={`size-1.5 shrink-0 rounded-full ${user.status === "online" ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <span className="shrink-0 font-medium">{user.userName}{isMe ? " (나)" : ""}</span>
                  <span className="max-w-40 truncate text-slate-500 dark:text-slate-400" title={location?.filePath}>
                    {location ? `${location.filePath.split("/").at(-1)}${location.line ? `:${location.line}` : ""}${location.headSha !== revision?.headSha ? " (다른 버전)" : ""}` : user.status === "reconnecting" ? "재연결 대기" : "위치 공유 전"}
                  </span>
                  {!isMe && location && (
                    <>
                      <Button type="button" variant="ghost" size="icon-xs" title={`${user.userName}의 위치로 이동`} aria-label={`${user.userName}의 위치로 이동`} onClick={() => { setFollowUserId(null); setSelection(null); selectionAnchorRef.current = null; moveToLocation(location) }}>
                        <LocateFixed />
                      </Button>
                      <Button type="button" variant={following ? "secondary" : "ghost"} size="icon-xs" title={following ? "따라가기 종료" : `${user.userName} 따라가기`} aria-label={following ? "따라가기 종료" : `${user.userName} 따라가기`} aria-pressed={following} onClick={() => { setFollowUserId(following ? null : user.userId); if (!following) { if (scrollTimerRef.current !== null) window.clearTimeout(scrollTimerRef.current); setSelection(null); selectionAnchorRef.current = null; stopSharingLocation() } }}>
                        {following ? <EyeOff /> : <Eye />}
                      </Button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {codeMessageNotice && (
          <div role="status" aria-live="polite" className="mt-2 flex items-start gap-2 border-l-2 border-emerald-600 bg-emerald-50 px-3 py-2 text-xs text-slate-800 dark:bg-emerald-950/40 dark:text-slate-100">
            <Bell className="size-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{codeMessageNotice.message.author.name ?? "참여자"}님의 새 코드 대화{codeMessageNotice.count > 1 ? ` 외 ${codeMessageNotice.count - 1}개` : ""}</p>
              {codeMessageNotice.message.codeReference && (
                <CollaborationCodeLink reference={codeMessageNotice.message.codeReference} files={files} onClick={() => openCodeReference(codeMessageNotice.message.codeReference!, codeMessageNotice.message.id)} />
              )}
            </div>
            <Button type="button" variant="ghost" size="icon-xs" title="알림 닫기" aria-label="알림 닫기" onClick={() => setCodeMessageNotice(null)}><X /></Button>
          </div>
        )}
        {navigationError && <p role="alert" className="mt-2 pl-10 text-xs text-rose-600">{navigationError}</p>}
        {status === "reconnecting" && room.status === "ACTIVE" && (
          <p role="status" className="mt-2 pl-10 text-xs text-amber-700 dark:text-amber-400">
            실시간 연결을 복구하는 중입니다. 대화는 계속 갱신됩니다.
          </p>
        )}
        {error && room.status === "ACTIVE" && (
          <div role="alert" className="mt-2 flex items-center gap-2 pl-10 text-xs text-rose-600 dark:text-rose-400">
            <span>{error}</span>
            <Button type="button" variant="ghost" size="xs" onClick={() => void joinRoom(room.id).catch(() => {})}>
              <RefreshCw /> 다시 연결
            </Button>
          </div>
        )}
      </header>

      <nav aria-label="협업방 화면" className="grid shrink-0 grid-cols-2 border-b border-slate-200 dark:border-slate-800 xl:hidden">
        {([
          ["files", "파일", FileCode2],
          ["code", "코드", Code2],
        ] as const).map(([panel, label, Icon]) => (
          <button
            key={panel}
            type="button"
            aria-current={mobilePanel === panel ? "page" : undefined}
            onClick={() => setMobilePanel(panel)}
            className={`flex h-11 items-center justify-center gap-1.5 border-b-2 text-sm font-medium ${
              mobilePanel === panel
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
                : "border-transparent text-slate-500 dark:text-slate-400"
            }`}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </nav>

      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)]">
        <aside aria-label="변경 파일" className={`${mobilePanel === "files" ? "flex" : "hidden"} min-h-0 min-w-0 flex-col border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 xl:flex`}>
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-200 px-4 text-xs font-semibold dark:border-slate-800">
            <span>변경 파일</span><span className="text-slate-500">{files.length}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {filesPending ? (
              <div className="flex items-center gap-2 p-3 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> 파일을 불러오는 중</div>
            ) : filesError ? (
              <p className="p-3 text-sm text-rose-600">파일을 불러오지 못했습니다.</p>
            ) : files.length === 0 ? (
              <p className="p-3 text-sm text-slate-500">변경 파일이 없습니다.</p>
            ) : files.map((file) => {
              const selected = file.filename === selectedFile?.filename
              const badge = PR_FILE_STATUS_BADGE[file.status]
              return (
                <button
                  key={file.filename}
                  type="button"
                  onClick={() => selectFile(file.filename)}
                  aria-current={selected ? "true" : undefined}
                  title={file.filename}
                  className={`mb-0.5 flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-2 text-left text-xs ${
                    selected
                      ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <FileIcon filename={file.filename} size={14} />
                  <span className="min-w-0 flex-1 truncate">{file.filename}</span>
                  <span className={`shrink-0 text-[10px] font-bold ${badge.className}`}>{badge.label}</span>
                </button>
              )
            })}
          </div>
        </aside>

        <section aria-label="PR 코드" className={`${mobilePanel === "code" ? "flex" : "hidden"} min-h-0 min-w-0 flex-col xl:flex`}>
          <div className="flex h-11 shrink-0 items-center gap-2 border-b border-slate-200 px-4 text-xs dark:border-slate-800">
            <Code2 className="size-4 text-slate-500" />
            <span className="min-w-0 truncate font-medium">{selectedFile?.filename ?? "코드"}</span>
            {activeSelection && activeSelection.filePath === selectedFile?.filename && (
              <span className="shrink-0 text-emerald-700 dark:text-emerald-300">
                {activeSelection.side === "LEFT" ? "이전" : "변경"} {activeSelection.startLine}
                {activeSelection.endLine !== activeSelection.startLine && `-${activeSelection.endLine}`}
              </span>
            )}
            {followUserId && (
              <Button type="button" variant="ghost" size="xs" onClick={() => setFollowUserId(null)} title="따라가기 종료">
                <EyeOff /> 따라가기 종료
              </Button>
            )}
            {selectedFile && <span className="ml-auto shrink-0 text-slate-500">+{selectedFile.additions} / -{selectedFile.deletions}</span>}
          </div>
          <div
            ref={codeScrollRef}
            tabIndex={0}
            className="min-h-0 flex-1 overflow-auto"
            onScroll={() => {
              if (scrollTimerRef.current !== null) window.clearTimeout(scrollTimerRef.current)
              scrollTimerRef.current = window.setTimeout(publishVisibleLocation, 120)
            }}
            onMouseUp={selectCodeText}
            onKeyUp={selectCodeText}
            onWheel={() => { if (followUserId) setFollowUserId(null) }}
            onTouchStart={() => { if (followUserId) setFollowUserId(null) }}
            onKeyDown={(event) => {
              if (followUserId && ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End"].includes(event.key)) setFollowUserId(null)
            }}
          >
            {filesPending ? (
              <div className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> 코드를 불러오는 중</div>
            ) : filesError ? (
              <p className="p-6 text-sm text-rose-600">코드를 불러오지 못했습니다.</p>
            ) : !selectedFile ? (
              <p className="p-6 text-sm text-slate-500">표시할 변경 파일이 없습니다.</p>
            ) : selectedFile.patch === null ? (
              <p className="p-6 text-sm text-slate-500">이 파일은 diff를 표시할 수 없습니다.</p>
            ) : (
              <CollaborationDiffViewer
                lines={lines}
                filePath={selectedFile.filename}
                selection={activeSelection?.filePath === selectedFile.filename ? activeSelection : null}
                sharedLocations={sharedLocations}
                typingUsers={activeTypingUsers}
                publishTyping={publishTyping}
                onLineSelect={selectLine}
                roomId={room.id}
                currentUserId={currentUserId}
                canSend={connected && room.status === "ACTIVE"}
                threadSummaries={threadsQuery.data?.threads ?? []}
                inlineThread={inlineThread?.filePath === selectedFile.filename ? inlineThread : null}
                onOpenThread={openInlineThread}
                onCloseThread={() => setInlineThread(null)}
              />
            )}
          </div>
        </section>

      </div>

      <aside id="collaboration-chat-panel" aria-label="협업방 대화" aria-hidden={!chatOpen} className={`${chatOpen ? "flex" : "hidden"} fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-50 h-[560px] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[380px] flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-950`}>
        <CollaborationMessages
          roomId={room.id}
          currentUserId={currentUserId}
          canSend={connected && room.status === "ACTIVE"}
          workspace
          visible={chatOpen}
          onClose={closeChat}
          selectedCodeReference={activeSelection}
          onClearSelection={() => { setSelection(null); selectionAnchorRef.current = null }}
          onOpenCodeReference={openCodeReference}
          publishTyping={publishTyping}
          typingNames={Object.values(typingUsers).filter((user) => !user.anchor).map((user) => user.userName)}
          messages={messages}
          messagesQuery={messagesQuery}
        />
      </aside>
      {!chatOpen && chatMessageNotice && (
        <div role="status" aria-live="polite" className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-50 flex w-[calc(100vw-2rem)] max-w-[340px] items-start gap-2 rounded-md border border-slate-200 bg-white p-3 text-left shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{chatMessageNotice.author.name ?? "참여자"}님의 새 메시지</p>
            {chatMessageNotice.codeReference ? (
              <CollaborationCodeLink reference={chatMessageNotice.codeReference} files={files} onClick={() => openCodeReference(chatMessageNotice.codeReference!, chatMessageNotice.id)} />
            ) : (
              <button type="button" onClick={openChat} className="w-full text-left text-xs text-emerald-800 underline underline-offset-2 dark:text-emerald-300">대화 열기</button>
            )}
            <p className="mt-1 truncate text-xs text-slate-600 dark:text-slate-300">{chatMessageNotice.content}</p>
          </div>
          <Button type="button" variant="ghost" size="icon-xs" title="메시지 알림 닫기" aria-label="메시지 알림 닫기" onClick={() => setChatMessageNotice(null)}><X /></Button>
        </div>
      )}
      {!chatOpen && (
        <Button type="button" size="icon" aria-label={unreadChatCount ? `대화 열기, 읽지 않은 메시지 ${unreadChatCount}개` : "대화 열기"} aria-controls="collaboration-chat-panel" aria-expanded={false} title="대화 열기" onClick={openChat} className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-50 size-14 rounded-full bg-emerald-700 text-white shadow-lg hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500">
          <MessageSquare className="size-6" />
          {unreadChatCount > 0 && <span className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full border-2 border-white bg-rose-600 text-[10px] font-bold text-white dark:border-slate-950">{unreadChatCount > 99 ? "99+" : unreadChatCount}</span>}
        </Button>
      )}
    </div>
  )
}
