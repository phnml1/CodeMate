"use client"

import { useEffect, useRef, useState } from "react"
import { Headphones, Loader2, Mic, MicOff, PhoneOff, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCollaborationVoice } from "@/hooks/useCollaborationVoice"
import type { CollaborationClientSocket } from "@/hooks/useCollaborationRoomSocket"

function RemoteAudio({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null)
  const [blocked, setBlocked] = useState(false)
  useEffect(() => {
    const audio = ref.current
    if (!audio) return
    audio.srcObject = stream
    void audio.play().then(() => setBlocked(false)).catch(() => setBlocked(true))
    return () => { audio.srcObject = null }
  }, [stream])
  return <>
    <audio ref={ref} autoPlay playsInline />
    {blocked && <Button type="button" variant="outline" size="xs" onClick={() => void ref.current?.play().then(() => setBlocked(false))}><Volume2 /> 소리 재생</Button>}
  </>
}

export default function VoiceControls({ roomId, connected, getSocket }: {
  roomId: string
  connected: boolean
  getSocket: () => CollaborationClientSocket | null
}) {
  const voice = useCollaborationVoice(roomId, connected, getSocket)
  const busy = voice.phase === "requesting" || voice.phase === "joining"
  return (
    <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5 text-xs">
      {voice.phase === "connected" ? (
        <>
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400" title="음성 대화 참여 중">
            <Headphones className="size-4" /> 음성 {voice.participants.length + 1}/4
          </span>
          <Button type="button" variant={voice.muted ? "secondary" : "ghost"} size="icon-xs" title={voice.muted ? "마이크 켜기" : "마이크 끄기"} aria-label={voice.muted ? "마이크 켜기" : "마이크 끄기"} aria-pressed={voice.muted} onClick={voice.toggleMute}>
            {voice.muted ? <MicOff /> : <Mic />}
          </Button>
          <Button type="button" variant="ghost" size="icon-xs" title="음성 대화 나가기" aria-label="음성 대화 나가기" onClick={() => voice.stop()}><PhoneOff /></Button>
          <span className="max-w-48 truncate text-slate-500 dark:text-slate-400" title={voice.participants.map((peer) => peer.userName).join(", ")}>
            {voice.participants.map((peer) => `${peer.userName}${voice.connectionStates[peer.socketId] === "failed" ? " (연결 실패)" : ""}`).join(", ")}
          </span>
        </>
      ) : (
        <Button type="button" variant="outline" size="xs" disabled={!connected || busy} onClick={() => void voice.start()} title="음성 대화 참여">
          {busy ? <Loader2 className="animate-spin" /> : <Headphones />} {busy ? "연결 중" : "음성 참여"}
        </Button>
      )}
      {voice.error && <span role="alert" className="max-w-56 text-rose-600 dark:text-rose-400">{voice.error}</span>}
      {Object.entries(voice.streams).map(([socketId, stream]) => <RemoteAudio key={socketId} stream={stream} />)}
    </div>
  )
}
