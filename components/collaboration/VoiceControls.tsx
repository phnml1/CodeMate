"use client"

import { useEffect, useRef, useState } from "react"
import { Headphones, Loader2, Mic, MicOff, PhoneOff, Volume2, VolumeX } from "lucide-react"
import { Popover } from "radix-ui"
import { Button } from "@/components/ui/button"
import { useCollaborationVoice } from "@/hooks/useCollaborationVoice"
import type { CollaborationClientSocket } from "@/hooks/useCollaborationRoomSocket"

const DEFAULT_PLAYBACK_VOLUME = 0.5
type PlaybackSetting = { volume: number; muted: boolean }

export function RemoteAudio({ stream, volume, muted }: { stream: MediaStream; volume: number; muted: boolean }) {
  const ref = useRef<HTMLAudioElement>(null)
  const [blocked, setBlocked] = useState(false)
  useEffect(() => {
    const audio = ref.current
    if (!audio) return
    audio.volume = volume
    audio.muted = muted
  }, [volume, muted])
  useEffect(() => {
    const audio = ref.current
    if (!audio) return
    let active = true
    audio.srcObject = stream
    void audio.play().then(() => { if (active) setBlocked(false) }).catch(() => { if (active) setBlocked(true) })
    return () => {
      active = false
      audio.pause()
      audio.srcObject = null
    }
  }, [stream])
  return <>
    <audio ref={ref} playsInline />
    {blocked && !muted && <Button type="button" variant="outline" size="xs" onClick={() => void ref.current?.play().then(() => setBlocked(false)).catch(() => setBlocked(true))}><Volume2 /> 소리 재생</Button>}
  </>
}

export default function VoiceControls({ roomId, connected, getSocket }: {
  roomId: string
  connected: boolean
  getSocket: () => CollaborationClientSocket | null
}) {
  const voice = useCollaborationVoice(roomId, connected, getSocket)
  const [playback, setPlayback] = useState<Record<string, PlaybackSetting>>({})
  const busy = voice.phase === "requesting" || voice.phase === "joining"

  const updatePlayback = (socketId: string, update: Partial<PlaybackSetting>) => {
    setPlayback((current) => {
      const previous = current[socketId] ?? { volume: DEFAULT_PLAYBACK_VOLUME, muted: false }
      return { ...current, [socketId]: { ...previous, ...update } }
    })
  }

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
          <Popover.Root>
            <Popover.Trigger asChild>
              <Button type="button" variant="ghost" size="icon-xs" title="상대 소리 설정" aria-label="상대 소리 설정"><Volume2 /></Button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content align="start" sideOffset={8} className="bg-popover text-popover-foreground z-50 w-72 max-w-[calc(100vw-1rem)] rounded-md border p-3 shadow-md">
                <p className="mb-3 text-sm font-medium">상대 소리</p>
                {voice.participants.length === 0 && <p className="text-muted-foreground text-xs">참여자를 기다리는 중</p>}
                <div className="space-y-3">
                  {voice.participants.map((participant) => {
                    const setting = playback[participant.socketId] ?? { volume: DEFAULT_PLAYBACK_VOLUME, muted: false }
                    return <div key={participant.socketId} className="min-w-0">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-xs" title={participant.userName}>{participant.userName}</span>
                        <Button type="button" variant="ghost" size="icon-xs" title={`${participant.userName} ${setting.muted ? "재생 켜기" : "재생 음소거"}`} aria-label={`${participant.userName} ${setting.muted ? "재생 켜기" : "재생 음소거"}`} aria-pressed={setting.muted} onClick={() => updatePlayback(participant.socketId, { muted: !setting.muted })}>
                          {setting.muted ? <VolumeX /> : <Volume2 />}
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="range" min="0" max="100" value={Math.round(setting.volume * 100)} aria-label={`${participant.userName} 재생 음량`} onChange={(event) => updatePlayback(participant.socketId, { volume: Number(event.target.value) / 100 })} className="min-w-0 flex-1 accent-emerald-600" />
                        <span className="w-8 text-right text-xs tabular-nums">{Math.round(setting.volume * 100)}%</span>
                      </div>
                    </div>
                  })}
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
          <Button type="button" variant="ghost" size="icon-xs" title="음성 대화 나가기" aria-label="음성 대화 나가기" onClick={() => { voice.stop(); setPlayback({}) }}><PhoneOff /></Button>
          <span className="max-w-48 truncate text-slate-500 dark:text-slate-400" title={voice.participants.map((peer) => peer.userName).join(", ")}>
            {voice.participants.map((peer) => `${peer.userName}${voice.connectionStates[peer.socketId] === "failed" ? " (연결 실패)" : ""}`).join(", ")}
          </span>
        </>
      ) : (
        <Button type="button" variant="outline" size="xs" disabled={!connected || busy} onClick={() => { setPlayback({}); void voice.start() }} title="음성 대화 참여">
          {busy ? <Loader2 className="animate-spin" /> : <Headphones />} {busy ? "연결 중" : "음성 참여"}
        </Button>
      )}
      {voice.error && <span role="alert" className="max-w-56 text-rose-600 dark:text-rose-400">{voice.error}</span>}
      {Object.entries(voice.streams).map(([socketId, stream]) => {
        const setting = playback[socketId] ?? { volume: DEFAULT_PLAYBACK_VOLUME, muted: false }
        return <RemoteAudio key={socketId} stream={stream} volume={setting.volume} muted={setting.muted} />
      })}
    </div>
  )
}
