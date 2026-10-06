"use client"

import { useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { ArrowUpRight, Loader2, Plus, Radio, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { workspacePRFilesQueryOptions } from "@/hooks/usePRFiles"
import {
  useCollaborationRooms,
  useCreateCollaborationRoom,
} from "@/hooks/useCollaborationRooms"
import type { CollaborationRoom } from "@/types/collaboration"

export default function CollaborationRoomPanel({
  prId,
  currentUserId,
}: {
  prId: string
  currentUserId: string
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: rooms = [], isPending, isError } = useCollaborationRooms(prId)
  const createRoom = useCreateCollaborationRoom(prId)
  const [error, setError] = useState<string | null>(null)
  const [isEntering, setIsEntering] = useState(false)
  const enteringRef = useRef(false)
  const prefetchRevisionFiles = () => {
    void queryClient.prefetchQuery(workspacePRFilesQueryOptions(prId))
  }

  const openRoom = async (existingRoom?: CollaborationRoom) => {
    if (enteringRef.current) return
    enteringRef.current = true
    setIsEntering(true)
    setError(null)
    try {
      const room = existingRoom ?? await createRoom.mutateAsync()
      // Keep the overlay until navigation unmounts this panel, not just until creation completes.
      router.push(`/collaboration/rooms/${room.id}`)
    } catch (nextError) {
      enteringRef.current = false
      setIsEntering(false)
      setError(nextError instanceof Error ? nextError.message : "협업방에 입장하지 못했습니다.")
    }
  }

  return (
    <section aria-busy={isEntering} className="border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {isEntering && createPortal(
        <div
          role="status"
          aria-live="polite"
          aria-label="협업방에 입장하는 중입니다."
          className="fixed inset-0 z-[100] flex cursor-wait items-center justify-center bg-white/80 dark:bg-black/70"
        >
          <Loader2 aria-hidden="true" className="size-10 animate-spin text-emerald-600 motion-reduce:animate-none dark:text-emerald-400" />
          <span className="sr-only">협업방에 입장하는 중입니다.</span>
        </div>,
        document.body,
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <Radio className="size-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">실시간 협업방</h2>
          <span className="text-xs text-slate-500">{isPending || isError ? "—" : rooms.length}</span>
        </div>
        <Button type="button" size="sm" disabled={isEntering || createRoom.isPending || isPending || isError} onMouseEnter={prefetchRevisionFiles} onFocus={prefetchRevisionFiles} onClick={() => void openRoom()}>
          {createRoom.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
          협업방 시작
        </Button>
      </div>
      <div className="space-y-1 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
        {isPending ? (
          <p className="text-sm text-slate-500">협업방을 불러오는 중입니다.</p>
        ) : isError ? (
          <p role="alert" className="text-sm text-rose-600">협업방 인원을 확인할 수 없습니다. 연결 복구를 기다리는 중입니다.</p>
        ) : rooms.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">아직 열린 협업방이 없습니다.</p>
        ) : rooms.map((room) => {
          const full = (room.occupiedCount ?? room.memberCount) >= room.capacity &&
            !room.members.some((member) => member.userId === currentUserId)
          return (
            <div key={room.id} className="flex min-w-0 items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{room.name}</p>
                <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Users className="size-3" /> {room.memberCount}/{room.capacity}
                  <span className="mx-1">·</span>
                  <span className="truncate">방장 {room.owner.name ?? "알 수 없음"}</span>
                  {full && <span className="shrink-0 text-amber-700 dark:text-amber-400">정원 마감</span>}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" disabled={isEntering || full} onMouseEnter={prefetchRevisionFiles} onFocus={prefetchRevisionFiles} onClick={() => void openRoom(room)}>
                <ArrowUpRight /> 입장
              </Button>
            </div>
          )
        })}
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      </div>
    </section>
  )
}
