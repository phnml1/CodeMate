"use client"

import { useCallback, useEffect, useRef } from "react"
import type { CollaborationTypingAnchor } from "@/lib/socket/types"

const TYPING_REFRESH_MS = 1_500
const TYPING_IDLE_MS = 3_000

export function useCollaborationTyping({
  canSend,
  anchor,
  publishTyping,
}: {
  canSend: boolean
  anchor: CollaborationTypingAnchor | null
  publishTyping: (anchor: CollaborationTypingAnchor | null, isTyping: boolean) => void
}) {
  const stopTimerRef = useRef<number | null>(null)
  const activeRef = useRef(false)
  const lastPublishedAtRef = useRef(0)

  const stopTyping = useCallback(() => {
    if (stopTimerRef.current !== null) window.clearTimeout(stopTimerRef.current)
    stopTimerRef.current = null
    if (activeRef.current) publishTyping(anchor, false)
    activeRef.current = false
    lastPublishedAtRef.current = 0
  }, [anchor, publishTyping])

  const updateTyping = useCallback((value: string) => {
    if (!canSend || !value.trim()) {
      stopTyping()
      return
    }
    const now = Date.now()
    if (!activeRef.current || now - lastPublishedAtRef.current >= TYPING_REFRESH_MS) {
      publishTyping(anchor, true)
      activeRef.current = true
      lastPublishedAtRef.current = now
    }
    if (stopTimerRef.current !== null) window.clearTimeout(stopTimerRef.current)
    stopTimerRef.current = window.setTimeout(stopTyping, TYPING_IDLE_MS)
  }, [anchor, canSend, publishTyping, stopTyping])

  useEffect(() => {
    if (!canSend) stopTyping()
    return stopTyping
  }, [canSend, stopTyping])

  return { updateTyping, stopTyping }
}
